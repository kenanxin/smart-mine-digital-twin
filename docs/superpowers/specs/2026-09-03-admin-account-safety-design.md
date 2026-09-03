# Admin Account Safety Design

## Goal

Make the Supabase-backed administration page safe for the current super administrator and complete the existing account-management workflow.

## Design

- The server remains authoritative. A `super_admin` may edit other accounts, but a request targeting the current session subject cannot change its role away from `super_admin` or its status away from `active`.
- `GET /api/admin/users` adds `isSelf` to each returned user by comparing the profile id with the authenticated session subject. Internal session tokens remain server-side.
- The current super administrator row renders a fixed "超级管理员" role and "启用" status instead of editable selects. Other accounts retain the four assignable roles: enterprise, regulator, expert, and viewer.
- Each account has a password-reset command. It opens an accessible dialog, requires at least eight characters, posts to the existing reset-password endpoint, clears the password field, and refreshes audit data after success.
- User-controlled strings and audit values are HTML-escaped before rendering.
- Existing create/update/reset audit writes remain unchanged and the UI maps action keys to readable Chinese labels.

## Error Handling And Tests

- Self-demotion and self-disable requests return `409 ADMIN_SELF_PROTECTED` without calling the Supabase mutation service or writing an audit event.
- Frontend contract tests cover fixed super-admin rendering, the reset dialog, the reset endpoint, and disabled self-edit controls.
- Backend unit tests cover allowed ordinary-user updates and rejected self-demotion/self-disable updates.

## Non-Goals

- Creating additional super administrators.
- Changing Supabase schema, authentication provider, session lifetime, or the three portal applications.
- Deleting accounts or implementing email-based password recovery.
