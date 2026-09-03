# Three-Role Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real login, session protection, and server-enforced enterprise/regulator/expert portal isolation to the existing RoofRisk platform.

**Architecture:** A focused CommonJS authentication service owns seeded accounts, scrypt password verification, opaque in-memory sessions, expiry, cookie parsing, and login throttling. The existing Node HTTP server exposes authentication endpoints and protects the application shell plus every RoofRisk endpoint; the browser loads the authenticated session before initializing the existing Three.js/data application and derives the only visible portal from the server-provided role.

**Tech Stack:** Node.js 18+ built-ins (`http`, `crypto`, `node:test`), HTML5, CSS3, browser ES modules, existing Three.js/ECharts application.

## Global Constraints

- Keep one Node service and add no runtime dependency.
- Sessions use random 256-bit tokens, expire absolutely after 8 hours, and are sent in `roofrisk_session` cookies with `HttpOnly`, `SameSite=Strict`, `Path=/`, and `Max-Age=28800`; add `Secure` when the request is HTTPS.
- Lock login attempts after five failures per normalized username and client address in a rolling 15-minute window.
- Commit only password hashes in `scrypt$16384$8$1$<salt-hex>$<64-byte-derived-key-hex>` format; allow the three documented environment variables to override them.
- `/`, `/index.html`, and all `/api/roof-risk/*` routes require authentication; `/login`, `/login.html`, `/api/auth/login`, `/api/auth/session`, and `/api/auth/logout` remain accessible as defined.
- Authenticated role is authoritative: conflicting `portal` query parameters are replaced with the session role.
- Enterprise may `advance` and `reset`; regulator may `advance` and `archive`; expert may perform neither. All roles may read RoofRisk data and select representative events.
- Preserve the real teacher CSV, Kalman/XGBoost artifact, RoofRisk response shapes, event selection, and six-stage disaster demonstration.
- Authentication/API failures must display unavailable or actionable error states and must never synthesize replacement measurements.

---

## File Structure

- Create `server/auth-service.js`: users, password hashes, timing-safe scrypt verification, sessions, throttling, cookies, and role/action policy.
- Create `tests/auth-service.test.mjs`: unit coverage for credentials, session lifetime, throttling, cookies, and authorization.
- Modify `server.js`: auth routes, redirects, protected routes, request identity, and role enforcement.
- Modify `tests/roof-risk-api.test.mjs`: authenticated HTTP helpers and endpoint/permission integration coverage.
- Create `login.html`, `css/login.css`, `js/login.js`: accessible login workflow with loading, invalid-credential, rate-limit, and existing-session states.
- Create `images/login-underground.jpg`: local still captured from the existing underground scene.
- Create `js/auth-client.mjs`: session fetch, authoritative portal URL mapping, logout, and unauthorized response handling.
- Modify `index.html`, `css/style.css`, `js/main.js`: identity header, logout control, role-only portal initialization, action visibility, and session-first bootstrap.
- Create `tests/auth-frontend.test.mjs`: static/module contract tests for role isolation and login behavior.
- Modify `README.md`: accounts, environment hash overrides, login flow, session properties, and permissions.

### Task 1: Authentication Domain Service

**Files:**
- Create: `server/auth-service.js`
- Create: `tests/auth-service.test.mjs`

**Interfaces:**
- Produces: `createAuthService(options?)` with `login({username,password,clientId,now?})`, `getSession(token, now?)`, `logout(token)`, `can(role, action)`, and `users` metadata.
- Produces: `parseCookies(header)`, `serializeSessionCookie(token, {secure?})`, and `serializeExpiredSessionCookie({secure?})`.
- Login returns `{ token, user: { username, displayName, role }, expiresAt }`; failures throw `AuthError` with `code`, `statusCode`, and optional `retryAfter`.

- [ ] **Step 1: Write failing service tests** for valid credentials, wrong credentials, unknown users, environment hash overrides, eight-hour expiry, logout invalidation, five-attempt throttling, cookie flags, and the action matrix.
- [ ] **Step 2: Run `node --test tests/auth-service.test.mjs`** and verify failure because `server/auth-service.js` does not exist.
- [ ] **Step 3: Implement the service** with `crypto.scrypt`, `crypto.randomBytes(32)`, `crypto.timingSafeEqual`, injectable clock/random hooks for deterministic tests, normalized usernames, and per-username/client failure buckets pruned after 15 minutes.
- [ ] **Step 4: Run `node --test tests/auth-service.test.mjs`** and verify all authentication unit tests pass.
- [ ] **Step 5: Commit** `server/auth-service.js` and `tests/auth-service.test.mjs` as `feat: add role authentication service`.

### Task 2: Protected HTTP Routes and Authorization

**Files:**
- Modify: `server.js`
- Modify: `tests/roof-risk-api.test.mjs`

**Interfaces:**
- Consumes: `createAuthService`, cookie helpers, and `AuthError` from Task 1.
- Produces: `GET /login`, `GET /login.html`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`.
- Produces: `createAppServer({ authService? })` injection for isolated tests.

- [ ] **Step 1: Update API tests to authenticate explicitly**, preserve `Set-Cookie`, verify unauthenticated HTML redirects to `/login`, unauthenticated APIs return `401 AUTH_REQUIRED`, valid login returns role metadata, logout expires the cookie, and invalid/limited logins return structured `401`/`429` errors.
- [ ] **Step 2: Add role-matrix integration tests** proving all roles can read/select, enterprise can advance/reset, regulator can advance/archive, and expert receives `403 FORBIDDEN` for mutations.
- [ ] **Step 3: Run `node --test tests/roof-risk-api.test.mjs`** and verify the new protection tests fail against the current open server.
- [ ] **Step 4: Implement auth routing and guards** before RoofRisk dispatch, use `X-Forwarded-Proto`/socket encryption for `Secure`, send `Retry-After` for throttling, redirect authenticated `/login` requests to the role URL, and reject disallowed closed-loop actions before calling the repository.
- [ ] **Step 5: Run `node --test tests/auth-service.test.mjs tests/roof-risk-api.test.mjs tests/roof-risk-repository.test.mjs`** and verify all relevant backend tests pass.
- [ ] **Step 6: Commit** `server.js` and `tests/roof-risk-api.test.mjs` as `feat: protect RoofRisk routes by role`.

### Task 3: Login Experience

**Files:**
- Create: `login.html`
- Create: `css/login.css`
- Create: `js/login.js`
- Create: `images/login-underground.jpg`
- Create: `tests/auth-frontend.test.mjs`

**Interfaces:**
- Consumes: `POST /api/auth/login` and `GET /api/auth/session`.
- Produces: a no-role-selector form posting `{ username, password }`, redirecting to the returned role URL, and displaying inline errors for `INVALID_CREDENTIALS`, `RATE_LIMITED`, validation, network failure, and server failure.

- [ ] **Step 1: Add failing frontend contract tests** for labeled username/password controls, password visibility icon, submit state, error live region, no role selector, local background asset, and credentials sent only in a POST JSON body.
- [ ] **Step 2: Run `node --test tests/auth-frontend.test.mjs`** and verify it fails because the login assets do not exist.
- [ ] **Step 3: Capture a representative underground scene still** at desktop resolution and place the final compressed JPEG at `images/login-underground.jpg`; do not retain capture intermediates.
- [ ] **Step 4: Build the login page** with a full-bleed inspectable mine image, a compact right-side access panel, graphite `#0B1117`, steel `#18232D`, signal cyan `#39C6D8`, safety amber `#F3A712`, off-white `#EDF4F6`, system Chinese body typography, visible focus rings, reduced-motion handling, and responsive 390px layout.
- [ ] **Step 5: Implement login behavior** including trimmed username, non-empty password validation, disabled/loading submission, mapped error text, password visibility with accessible state, existing-session redirect, and URL rewrite to `?scene=v2&view=underground&field=risk&portal=<role>`.
- [ ] **Step 6: Run `node --test tests/auth-frontend.test.mjs`** and verify the login contract passes.
- [ ] **Step 7: Commit** the login assets and test as `feat: add secure mine portal login`.

### Task 4: Authenticated Portal Bootstrap and Identity UI

**Files:**
- Create: `js/auth-client.mjs`
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/main.js`
- Modify: `tests/auth-frontend.test.mjs`

**Interfaces:**
- Produces: `loadSession()`, `rolePortalUrl(role, locationLike?)`, `applyRolePortal(user)`, `logout()`, and `authFetch(input, init?)` where a 401 redirects to `/login` and rejects without fallback data.
- Consumes: `{ authenticated: true, user: { username, displayName, role }, expiresAt }` from `/api/auth/session`.

- [ ] **Step 1: Extend failing frontend tests** to require removal of the three portal buttons, identity name/role elements, icon logout control, session-before-`initApp` bootstrap, authoritative role URL rewriting, permission-based action visibility, and use of `authFetch` for protected requests.
- [ ] **Step 2: Run `node --test tests/auth-frontend.test.mjs`** and verify the new expectations fail.
- [ ] **Step 3: Implement `auth-client.mjs`** with the three role labels, canonical URLs, session parsing, logout POST, and centralized 401 behavior.
- [ ] **Step 4: Replace the portal switch in `index.html`** with the authenticated identity group and a Lucide-style familiar logout symbol implemented as text-safe inline icon markup with `aria-label`/tooltip; keep the date and service status.
- [ ] **Step 5: Update `main.js`** so session loading precedes every scene/chart/API initializer, only the authenticated portal body class is set, URL `portal` is rewritten, protected fetches use `authFetch`, and disallowed closed-loop controls are hidden from the DOM flow.
- [ ] **Step 6: Update responsive CSS** for desktop and 390x844 identity/logout/header layouts without overlapping or nested cards.
- [ ] **Step 7: Run `node --test tests/auth-frontend.test.mjs tests/roof-risk-frontend-mapping.test.mjs`** and verify all frontend contracts pass.
- [ ] **Step 8: Commit** frontend integration as `feat: bind portals to authenticated roles`.

### Task 5: Documentation and End-to-End Verification

**Files:**
- Modify: `README.md`
- Optionally create: `docs/qa/2026-09-02-three-role-authentication-qa.md`

**Interfaces:**
- Consumes: the final login/session/API behavior from Tasks 1-4.
- Produces: operator instructions and reproducible QA evidence.

- [ ] **Step 1: Document login-first startup**, the three seeded demo accounts, hash override variable names, hash format, eight-hour in-memory session behavior, restart invalidation, lockout policy, and the exact role permission table.
- [ ] **Step 2: Run the focused suite** with `node --test tests/auth-service.test.mjs tests/roof-risk-api.test.mjs tests/auth-frontend.test.mjs tests/roof-risk-repository.test.mjs tests/roof-risk-frontend-mapping.test.mjs`.
- [ ] **Step 3: Run the complete suite** with `npm test`; record the six known unrelated `mine-v2-config` failures separately from authentication results.
- [ ] **Step 4: Start a fresh server on a free port** and verify login, refresh persistence, logout, direct unauthenticated URL redirection, conflicting portal rewrite, and 403 permissions for all three accounts.
- [ ] **Step 5: Capture and inspect desktop and 390x844 screenshots** for the login page and each role portal; confirm the Three.js canvas contains non-background pixels, the scene is framed, long Chinese text fits, and controls do not overlap.
- [ ] **Step 6: Commit** documentation and QA evidence as `docs: document three-role access control`.

## Self-Review

- Spec coverage: every approved authentication, session, throttle, route, cookie, role, mutation, UI, responsive, and documentation requirement maps to a task above.
- Placeholder scan: the plan contains no deferred implementation markers; every failure state and interface is named.
- Interface consistency: role keys remain `enterprise`, `regulator`, and `expert`; session user fields remain `username`, `displayName`, and `role`; action keys remain `advance`, `archive`, and `reset` across service, server, frontend, and tests.
