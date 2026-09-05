# Challenge Cup UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved “深地层指挥舱” UI across the enterprise, regulator, expert, login, and admin surfaces while preserving real RoofRisk data, role permissions, and Three.js fidelity.

**Architecture:** Keep the current vanilla HTML/CSS/ES-module architecture. Move statistical normalization into pure view-model functions, keep ECharts lifecycle ownership in `js/charts.js`, and let `js/main.js` coordinate authenticated data with stable DOM regions. Apply one shared industrial token language across the role surfaces without changing the API, authentication, or Three.js scene topology.

**Tech Stack:** Node.js 18+, vanilla ES modules, Apache ECharts 6.1.0 Canvas renderer, Three.js 0.160.0, CSS Grid, Node test runner, Playwright QA scripts.

## Global Constraints

- All business values come from the RoofRisk API and `teacher_roof_monitoring.csv`; no random or simulated fallback values.
- P05/P95 are statistical references, not safety thresholds or model probabilities.
- Keep the current Three.js models, textures, HDR assets, renderer quality, and user camera state.
- Use `4 / 8 / 12 / 16 / 24px` spacing, `3-6px` radii, stable chart dimensions, and no nested cards.
- Risk state uses text plus shape/icon/position; color is never the only signal.
- ECharts updates reuse instances, observe container size, cap replay updates at 5 Hz, and use animations no longer than 280 ms.
- Verify in Google Chrome at `1920x1080`, `1366x768`, and `390x844`.

---

### Task 1: Statistical Reference Model

**Files:**
- Modify: `js/roof-risk-chart-model.mjs`
- Modify: `js/roof-risk-view-model.mjs`
- Test: `tests/roof-risk-chart-model.test.mjs`
- Test: `tests/roof-risk-frontend-mapping.test.mjs`

**Interfaces:**
- Produces `referenceDirection`, `referenceIndex`, `isReferenceDeviation`, and fixed-order metric rows.
- `thresholdTrend` remains `{ mode, reference, sampleCount, exceededCount, peakIndex, series }`, with `mode: 'reference-deviation'` for metric history.

- [ ] Add failing fixtures for non-zero P05, high-side deviation, low-side distance proximity, invalid ranges, and fixed row order.
- [ ] Replace `value / p95 * 100` with direction-aware P05-P95 normalization:

```js
const index = direction === 'low'
  ? ((p95 - value) / (p95 - p05)) * 100
  : ((value - p05) / (p95 - p05)) * 100;
```

- [ ] Preserve raw value, unit, P05, P95, direction, and source time on every trend point.
- [ ] Return unavailable state for missing/non-finite values or `p95 <= p05`; do not create zero-valued substitutes.
- [ ] Run `node --test tests/roof-risk-chart-model.test.mjs tests/roof-risk-frontend-mapping.test.mjs` and commit.

### Task 2: ECharts Evidence Language

**Files:**
- Modify: `js/charts.js`
- Modify: `index.html`
- Test: `tests/charts-contract.test.mjs`
- Test: `tests/three-portal-ui.test.mjs`

**Interfaces:**
- Consumes Task 1 `thresholdTrend` fields.
- Produces a “统计参考偏离趋势” chart with direct `100%` reference labeling and truthful risk-score fallback labeling.

- [ ] Add failing contract tests for the new labels, rich-text tooltips, raw P05/P95 fields, and no threshold wording.
- [ ] Update the time-series option to use restrained direct labels, `sampling: 'lttb'`, stable grid bounds, and animation duration at most 280 ms.
- [ ] Keep one instance per container, one shared `ResizeObserver`, merge data-only updates, and structurally replace only when series shape changes.
- [ ] Ensure empty/error updates clear stale series and render a concrete retry-oriented message.
- [ ] Run `node --test tests/charts-contract.test.mjs tests/three-portal-ui.test.mjs` and commit.

### Task 3: Enterprise Command Surface

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/main.js`
- Test: `tests/three-portal-ui.test.mjs`

**Interfaces:**
- Uses current RoofRisk record as the sole owner of the right-side risk score and scene status overlay.
- Produces fixed metric rails, a focused deviation summary, and stable second/third screen sections.

- [ ] Add failing DOM contracts for a skip link, main landmark, attention summary, stable metric anchors, status text, and replay controls.
- [ ] Recompose the first viewport so Three.js remains dominant, the right rail is the only primary score, and supporting panels use dividers instead of nested cards.
- [ ] Rebuild the second screen as summary → fixed metric rails → deviation trend → model explanation.
- [ ] Update DOM rendering without `innerHTML` from untrusted fields; use text nodes or an escaping helper for API values.
- [ ] Keep replay updates from moving the camera, reordering metric rows, or changing section height.
- [ ] Run `node --test tests/three-portal-ui.test.mjs tests/auth-frontend.test.mjs` and commit.

### Task 4: Role Surfaces, Login, and Admin

**Files:**
- Modify: `index.html`
- Modify: `login.html`
- Modify: `admin.html`
- Modify: `css/style.css`
- Modify: `css/login.css`
- Modify: `css/admin.css`
- Modify: `js/login.js`
- Modify: `js/admin.js`
- Test: `tests/auth-frontend.test.mjs`
- Test: `tests/admin-access.test.mjs`

**Interfaces:**
- Preserves existing authentication, portal routing, viewer read-only behavior, and administrator protection rules.

- [ ] Add failing checks for labels, autocomplete, semantic actions, `aria-live`, keyboard focus, and destructive-action confirmation.
- [ ] Apply the shared deep-strata tokens and compact typography to regulator, expert, login, and admin screens.
- [ ] Keep admin data dense: tabular numeric columns, monospace identifiers/timestamps, stable row actions, and no decorative dashboard cards.
- [ ] Remove emoji and non-Lucide decorative icons; give icon-only controls an accessible name and tooltip.
- [ ] Run `node --test tests/auth-frontend.test.mjs tests/admin-access.test.mjs` and commit.

### Task 5: Local Assets and Interaction Hardening

**Files:**
- Create: `assets/fonts/README.md`
- Modify: `css/style.css`
- Modify: `css/login.css`
- Modify: `css/admin.css`
- Modify: `index.html`
- Modify: `login.html`
- Modify: `admin.html`
- Test: `tests/production-assets.test.mjs`

**Interfaces:**
- Produces offline-safe typography fallbacks, matching dark browser chrome, and reduced-motion behavior.

- [ ] Add failing tests proving no runtime font CDN imports and correct `color-scheme`/theme metadata.
- [ ] Vendor the required font files with licenses or use the approved system-font fallback when a redistributable file is unavailable.
- [ ] Add `font-display: swap`, visible `:focus-visible`, safe-area padding, text overflow handling, and reduced-motion overrides.
- [ ] Run `node --test tests/production-assets.test.mjs` and commit.

### Task 6: Chrome Quality Gate and Delivery

**Files:**
- Modify: `tools/capture-three-portal-ui-qa.cjs`
- Create: `docs/qa/2026-09-05-challenge-cup-ui-redesign-qa.md`

**Interfaces:**
- Produces screenshots and machine-readable checks for the three roles and login/admin surfaces.

- [ ] Start the local server and authenticate the required test roles.
- [ ] Capture `1920x1080`, `1366x768`, and `390x844` in Google Chrome; verify no overlap, horizontal overflow, blank canvas, or unexpected console/network errors.
- [ ] Play real replay data for 30 seconds; verify no layout shift, metric reorder, camera jump, or chart reinitialization.
- [ ] Run two complete “一键演示 → 复位” cycles and verify deterministic record, camera, replay, and closure state.
- [ ] Measure cached shell visibility, Three.js interactivity, steady FPS, and control latency against the approved budget.
- [ ] Run `npm test`, `npm run preflight:offline`, `git diff --check`, commit the QA report, push `main`, and verify Vercel production.
