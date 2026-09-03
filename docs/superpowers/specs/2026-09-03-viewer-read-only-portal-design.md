# Viewer Read-Only Portal Design

## Goal

Make administrator-created `viewer` accounts usable without adding a fourth application portal.

## Behavior

- Authentication accepts `viewer` as a valid account role.
- A viewer is labeled `只读用户` and reuses the expert portal layout.
- Viewer URLs are canonicalized to `portal=expert`; no unsupported `portal-viewer` CSS mode is created.
- Viewer accounts expose no closed-loop action buttons.
- The server keeps `viewer` permissions empty, so direct mutation requests remain forbidden.
- Super administrators continue to enter `/admin`.

## Verification

- Unit tests cover frontend role acceptance and canonical URL generation.
- Server tests cover viewer-to-expert portal routing.
- Existing role authorization tests continue to verify that read-only roles cannot mutate closed-loop state.
