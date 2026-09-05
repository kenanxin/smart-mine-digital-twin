# Clean Login Background Design

## Goal

Replace the outdated login still with a reproducible capture of the current project roadway. The login image must communicate the mine environment without presenting simulated or untraceable monitoring values as real data.

## Visual Direction

- Use the current focused longwall Three.js scene, including its arched roadway, supports, pipes, equipment, lighting, and current full-quality materials.
- Capture a quiet normal-monitoring view suitable for text overlay.
- Hide CSS2D monitor labels, field legends, warning cards, risk overlays, controls, headers, and all business panels.
- Keep monitoring values exclusively inside the authenticated application, where the API can supply source, record id, and timestamp.
- Preserve the existing restrained graphite, cyan, amber, and paper login-page system. Only the scene still changes.

## Reproducibility

A dedicated Playwright capture script logs into the local application, opens the current V2 underground scene at 1600x1000, removes all non-scene layers, waits for the detailed assets to settle, and writes the final JPEG directly to `images/login-underground.jpg`.

## Verification

- Static tests inspect the capture contract and JPEG dimensions.
- Desktop and mobile screenshots verify crop, legibility, and lack of overlap.
- The full Node test suite must remain green.

