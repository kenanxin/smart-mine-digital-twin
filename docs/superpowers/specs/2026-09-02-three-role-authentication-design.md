# Three-Role Authentication Design

## Goal

Add a real login and session boundary to the existing single-Node smart-mine platform. Enterprise operators, regulators, and expert analysts authenticate with separate accounts and are taken only to their assigned portal. URL parameters and the former portal switch must not allow cross-role access.

## Scope

This feature covers:

- a dedicated login screen;
- three seeded demonstration users with password hashes;
- server-side sessions stored in memory;
- an HttpOnly session cookie;
- authentication for the application shell and every RoofRisk API route;
- role-specific portal selection and closed-loop permissions;
- current-user identity and logout controls;
- automated authentication, authorization, and frontend mapping tests;
- operator documentation for credentials and production overrides.

Account creation, password recovery, an administration console, external SSO, persistent database sessions, and multi-instance session replication are out of scope.

## Roles And Seeded Users

The system has exactly three roles:

| Role key | Portal | Seeded username | Display name |
| --- | --- | --- | --- |
| `enterprise` | 企业端 | `enterprise_operator` | 企业端操作员 |
| `regulator` | 监管端 | `regulator_officer` | 监管端监管员 |
| `expert` | 智库端 | `expert_analyst` | 智库端专家 |

The role is derived exclusively from the authenticated account. The login form does not include a role selector. Seeded password hashes are committed for competition demonstration; plaintext demonstration passwords are documented in the README and must not appear in browser-delivered JavaScript or HTML.

The local demonstration passwords are `Mine@2026` for enterprise, `Safe@2026` for regulator, and `Model@2026` for expert. They are documented for local competition use only and never embedded in browser-delivered files.

Deployments may override the committed hashes through `ROOFRISK_ENTERPRISE_PASSWORD_HASH`, `ROOFRISK_REGULATOR_PASSWORD_HASH`, and `ROOFRISK_EXPERT_PASSWORD_HASH`. Each value uses `scrypt$16384$8$1$<salt-hex>$<64-byte-derived-key-hex>`. The application must fail at startup when an override is malformed rather than silently reverting to a seeded credential.

## Architecture

```text
GET / or protected API
  -> parse roofrisk_session cookie
  -> authentication service validates session and expiry
  -> attach immutable user identity and role
  -> authorize requested operation
  -> serve assigned portal or RoofRisk response

POST /api/auth/login
  -> validate request and rate limit
  -> scrypt password verification
  -> random 256-bit session token
  -> server-side session record with 8-hour expiry
  -> HttpOnly SameSite=Strict cookie
  -> return public user identity
```

Add `server/auth-service.js` as the ownership boundary for users, password verification, sessions, expiry, failed-login throttling, and role checks. `server.js` remains responsible for HTTP routing, Cookie headers, static files, and mapping service errors to structured JSON.

The production architecture remains one Node process and adds no database or third-party authentication dependency.

## Password And Session Security

- Hash passwords with Node's built-in `crypto.scrypt` using a unique random salt per user.
- Compare derived keys with `crypto.timingSafeEqual`.
- Generate session tokens with `crypto.randomBytes(32)` and expose them only through the cookie.
- Store sessions in a private in-memory map; never return the token in JSON or log it.
- Use cookie name `roofrisk_session`, `HttpOnly`, `SameSite=Strict`, `Path=/`, and `Max-Age=28800`.
- Add `Secure` when the request is HTTPS, including trusted `X-Forwarded-Proto: https` deployments.
- Expire sessions after eight hours of absolute lifetime. Activity does not extend the deadline.
- Remove the server-side session on logout and send an expired cookie.
- Clean expired sessions opportunistically during session lookup and login; no background timer is required.
- Limit failed logins per normalized username and client address to five attempts in fifteen minutes. A limited request returns HTTP 429 with a retry message. Successful login clears that key's failures.
- All authentication errors use generic user-facing copy so the response does not reveal whether a username exists.

The seeded credentials are suitable for a local competition demonstration, not an Internet-facing production identity system. Production deployments must override them and should use a persistent shared session store if scaled beyond one process.

## Routes

### Public routes

- `GET /login` and `GET /login.html` serve `login.html`.
- Login assets such as CSS, JavaScript, logo, and the local underground background image remain public.
- `POST /api/auth/login` accepts `{ "username": string, "password": string }`.

### Authenticated routes

- `GET /` and `GET /index.html` serve the application shell; unauthenticated requests redirect to `/login`.
- `GET /api/auth/session` returns the public current-user object.
- `POST /api/auth/logout` invalidates the current session and clears the cookie.
- Every `/api/roof-risk/*` route requires a valid session and otherwise returns HTTP 401.

### Authorization

All three roles may read current risk, history, explanations, events, and precomputed record evaluation. All three may select a representative event because selection is a non-destructive viewing operation in this single-user competition service.

Closed-loop operations are role-aware:

| Action | Enterprise | Regulator | Expert |
| --- | --- | --- | --- |
| `advance` | allowed | allowed | denied |
| `archive` | denied | allowed | denied |
| `reset` | allowed | allowed | denied |

Denied authenticated requests return HTTP 403 with a structured `FORBIDDEN` error. Invalid or expired sessions return HTTP 401 and clear the stale cookie.

## Public Authentication Contract

Successful login and session responses expose only:

```json
{
  "authenticated": true,
  "user": {
    "username": "enterprise_operator",
    "display_name": "企业端操作员",
    "role": "enterprise",
    "portal": "enterprise"
  },
  "expires_at": "2026-09-02T22:00:00+08:00"
}
```

Passwords, salts, hashes, internal session ids, and failed-attempt counters never appear in API responses.

## Login Experience

The login page is the actual first screen, not a marketing page. It uses a full-viewport still image derived from the existing underground Three.js scene so the product and mining domain are immediately recognizable. A restrained dark overlay preserves contrast without blurring the mine scene.

The system logo and full product name remain a first-viewport signal. A compact authentication panel is docked to the right on desktop and becomes an unframed full-width form band on mobile. It contains:

- username input with a user icon;
- password input with a lock icon and accessible visibility toggle;
- a single `登录系统` command;
- inline loading, invalid-credential, rate-limit, and service-unavailable states;
- a short statement that the role is assigned by the account;
- no role picker and no visible demonstration passwords.

The page uses existing navy, cyan, green, yellow, orange, and red system tokens. The distinctive element is a vertical three-role access rail showing 企业执行、监管督办、智库研判 as system responsibilities, not selectable cards. The panel uses a maximum 6px radius and no nested cards, decorative orbs, gradients-as-illustration, or oversized promotional copy.

Keyboard behavior is complete: natural tab order, Enter submits, visible focus styles, the submit button disables while pending, errors receive `role=alert`, and focus returns to the username field after invalid credentials. Text must fit at 390x844 and desktop widths.

## Authenticated Portal Experience

After login, the application requests `/api/auth/session` before initializing Three.js, charts, RoofRisk polling, or closed-loop actions. This prevents a protected portal from flashing before authentication completes.

The former three-portal switch is replaced by a compact identity bar containing:

- the current role label;
- the user's display name;
- an icon-only logout button with tooltip and accessible label.

Only the assigned portal is activated. The frontend ignores a conflicting `portal` query parameter, rewrites the URL to the assigned portal, and removes or hides controls belonging to other roles. The user cannot switch roles without logging out and authenticating as another account.

Role-specific closed-loop buttons follow server permissions. Enterprise sees feedback, advance, and reset controls; regulator sees advance, archive, and reset; expert sees no mutation controls and an explicit read-only identity state.

On logout, session expiry, or any API 401 response, polling stops, mutable UI state is cleared, and the browser replaces the current history entry with `/login`. A 403 response displays a permission message without logging the user out.

## Error Handling

- Empty or malformed login input returns HTTP 400 and field-level guidance.
- Invalid credentials return HTTP 401 with `AUTH_INVALID_CREDENTIALS`.
- Expired or missing sessions return HTTP 401 with `AUTH_REQUIRED`.
- Disallowed role operations return HTTP 403 with `FORBIDDEN`.
- Rate-limited login returns HTTP 429 with `AUTH_RATE_LIMITED` and `retry_after_seconds`.
- Unexpected authentication failures return HTTP 500 with generic public copy and detailed server-side logging that excludes secrets.
- The login UI never treats network failure as invalid credentials.
- Protected API failures must not fall back to simulated RoofRisk values.

## Testing

### Authentication service tests

- all three seeded users authenticate and map to the correct portal;
- wrong passwords and unknown users return the same public error;
- password hashes are not plaintext and timing-safe verification is used;
- session tokens are unique, expire after eight hours, and cannot be reused after logout;
- failed-login throttling activates after five attempts and clears after successful login;
- role authorization matches the closed-loop matrix.

### HTTP contract tests

- `/` redirects unauthenticated clients to `/login`;
- login sets a valid HttpOnly SameSite cookie and never returns the token in JSON;
- session lookup returns the correct public identity;
- all RoofRisk APIs return 401 without a session;
- authenticated read routes work for each role;
- closed-loop operations return 403 for disallowed roles;
- logout clears the cookie and invalidates the server session;
- HTTPS-forwarded requests add the Secure cookie attribute;
- existing real-data API behavior remains unchanged after authentication.

### Frontend tests and visual QA

- role-to-portal mapping ignores conflicting query parameters;
- session expiry redirects before protected content is rendered;
- enterprise, regulator, and expert accounts each render only their assigned portal;
- desktop and 390x844 login layouts have no overflow or overlap;
- password visibility, Enter submission, loading, and error states work;
- authenticated enterprise Three.js canvas is nonblank;
- real event switching and six-stage demo restoration remain functional;
- browser console has no unexpected errors.

## Deployment And Documentation

Document the three local demonstration accounts, the eight-hour in-memory session behavior, password override environment variables, and the production limitation of single-process sessions. Existing real CSV and XGBoost build instructions remain unchanged.

The local service continues to start with `npm start`. No new runtime package is required because password hashing, random tokens, and Cookie handling use Node built-ins.

## Non-Goals

- self-service registration or account administration;
- persistent login across Node restarts;
- email, SMS, CAPTCHA, or password recovery;
- OAuth, LDAP, SAML, or enterprise SSO;
- fine-grained field-level data permissions;
- hiding browser-delivered source code as a security mechanism;
- changing the real CSV, XGBoost model, RoofRisk dataset, or Three.js mine scene.
