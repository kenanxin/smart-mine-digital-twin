# Admin Account Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent super-administrator self-lockout and complete password-reset and audit feedback in the existing administration page.

**Architecture:** `server.js` owns authorization-context checks and annotates listed users with `isSelf`; the Supabase service continues to own data mutations. The browser treats `isSelf` as display state, uses the existing reset endpoint, and escapes values before HTML rendering.

**Tech Stack:** Node.js 18+, Node test runner, Supabase REST/Auth APIs, browser ES modules, HTML dialog.

## Global Constraints

- Do not change the Supabase schema or expose service-role credentials.
- A current super administrator cannot change its own role or active status.
- Only enterprise, regulator, expert, and viewer can be assigned to ordinary accounts.
- Password resets require at least eight characters and remain audit logged.
- Preserve all real-data and Three.js behavior.

---

### Task 1: Server Self-Protection

**Files:**
- Modify: `server.js`
- Create: `tests/admin-access.test.mjs`

**Interfaces:**
- Produces: `assertAdminUserUpdateAllowed(operator, targetId, changes)`; throws `AuthError('ADMIN_SELF_PROTECTED', ..., 409)` for self-demotion or self-disable.
- Produces: `{ users: Array<User & { isSelf: boolean }> }` from `GET /api/admin/users`.

- [ ] Write failing tests for self-demotion, self-disable, unchanged self state, and ordinary-account updates.
- [ ] Run `node --test tests/admin-access.test.mjs` and verify failure.
- [ ] Implement the pure authorization check and apply it before `authService.updateUser`.
- [ ] Annotate the list response with `isSelf`.
- [ ] Run the backend test and commit with the frontend task after focused verification.

### Task 2: Safe Administration UI

**Files:**
- Modify: `admin.html`
- Modify: `js/admin.js`
- Modify: `tests/auth-frontend.test.mjs`

**Interfaces:**
- Consumes: `isSelf` from `GET /api/admin/users` and `POST /api/admin/users/:id/reset-password`.
- Produces: fixed self-role/status labels, editable ordinary-user selects, and `#resetDialog`.

- [ ] Add failing frontend contract assertions for the super-admin label, `isSelf`, reset dialog, and reset endpoint.
- [ ] Add the password-reset dialog with labeled password input, cancel, and submit controls.
- [ ] Rewrite user rendering with escaped values, fixed self controls, and per-row reset buttons.
- [ ] Map audit action keys to readable labels and refresh after successful mutations.
- [ ] Run focused authentication/frontend tests, then the full suite and record unrelated baseline failures separately.

### Task 3: Deploy And Verify

**Files:**
- Modify: the existing Vercel public deployment copy of `admin.html` and `js/admin.js`.

**Interfaces:**
- Produces: updated Vercel static admin UI and Render backend on the same Git commit.

- [ ] Commit only the scoped source, tests, and design/plan files.
- [ ] Create a fast-forward deployment commit based on `deploy/mine-v2-balanced` and push it.
- [ ] Publish the Vercel static files and manually deploy the same commit on Render.
- [ ] Log in, verify the self row is fixed, ordinary controls remain editable, reset dialog opens, and no console errors occur.
