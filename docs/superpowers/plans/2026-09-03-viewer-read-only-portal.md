# Viewer Read-Only Portal Implementation Plan

**Goal:** Complete the login and routing path for administrator-created `viewer` accounts.

## Tasks

- [x] Add `viewer` to the login role allowlist.
- [x] Define viewer metadata with the `只读用户` label and no actions.
- [x] Reuse the expert layout class and canonical `portal=expert` URL.
- [x] Map server login and session redirects for viewers to the expert portal.
- [x] Add focused frontend and server routing tests.
- [x] Run focused and full test suites (72/72 passing).
- [ ] Deploy and verify the production login flow.
