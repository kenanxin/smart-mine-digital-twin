# Challenge Cup UI Redesign QA

Date: 2026-09-06

## Scope

- Enterprise, regulator, and expert portals.
- Google Chrome at 1920x1080, 1366x768, and 390x844.
- Real CSV playback, XGBoost evidence, ECharts rendering, and Three.js camera stability.
- Login and administrator frontend contracts.

## Data Integrity

- Source: teacher-provided monitoring CSV.
- Rows: 20,000.
- Columns: 11.
- SHA-256: `86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A`.
- P05/P95 are presented as statistical reference bounds, not safety thresholds.
- Model evidence is mapped only from `feature_evidence`; statistical deviation is displayed separately.

## Chrome Results

All 9 role/viewport cases passed `tools/capture-three-portal-ui-qa.cjs`.

| Portal | 1920x1080 | 1366x768 | 390x844 |
| --- | --- | --- | --- |
| Enterprise | Pass | Pass | Pass |
| Regulator | Pass | Pass | Pass |
| Expert | Pass | Pass | Pass |

Checks passed:

- No horizontal overflow.
- Three.js and ECharts canvases are nonblank.
- ECharts instances resize with their containers.
- Replay remains unchanged while paused and advances exactly one record with Next.
- 5x playback advances multiple records without reinitializing the page.
- Primary risk score and replay risk score remain on the same record.
- Three.js camera position and target remain unchanged during playback.
- Page and core-monitoring heights remain unchanged during playback, including mobile.
- No unexpected page errors or HTTP errors.

## Stability Sample

During a 30-second Google Chrome playback check:

- Camera position remained `4.40,3.75,25.50`.
- Camera target remained `-0.90,2.00,5.80`.
- Page height remained `2353px` in the interactive desktop check.
- Core monitoring height remained `713px` in the interactive desktop check.
- Primary and replay risk scores remained consistent.

## Automated Verification

- `node --test`: 118 passed, 0 failed.
- `node tools/submission-preflight.mjs --offline`: passed.
- `git diff --check`: passed.

## Production Follow-up

After deployment, repeat the production URL smoke test for authentication, Render cold start, Supabase session creation, and the first Three.js asset load. These depend on production services and are not represented by the local Chrome result.
