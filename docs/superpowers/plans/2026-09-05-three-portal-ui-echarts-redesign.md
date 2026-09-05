# Three-Portal UI and ECharts Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the final polished enterprise, regulator, and expert dashboards with real RoofRisk data, truthful ECharts visualizations, stable responsive layouts, and unchanged Three.js fidelity.

**Architecture:** Extend the RoofRisk history response with the real metric values already owned by the repository, convert API payloads into chart-ready view models in a pure module, and keep ECharts instance ownership in one vanilla-JS chart module. `main.js` remains the authenticated request and DOM orchestration layer, while `index.html` and `style.css` define role-specific work surfaces over one shared industrial token system.

**Tech Stack:** Node.js 18+, vanilla ES modules, Apache ECharts 6.1.0 Canvas renderer, Three.js 0.160.0, CSS Grid, Node test runner, Playwright-based browser QA.

## Global Constraints

- All business values must come from RoofRisk API responses or dataset provenance; charts may not create dates, alert counts, production values, risk trends, or random data.
- Keep the current Three.js assets, texture quality, HDR, scene renderer, and pixel-ratio behavior unchanged.
- Use one ECharts instance per DOM node, one shared `ResizeObserver`, rich-text tooltips, time axes, and merge updates for data-only changes.
- Preserve authenticated role routing; viewer uses the expert read-only layout and gains no expert permissions.
- No CSS gradients, decorative blobs, marketing hero composition, or card radii above 6px.
- Status is communicated by text as well as color; mobile controls have a minimum 44px touch target.

---

### Task 1: Real chart data contracts

**Files:**
- Create: `js/roof-risk-chart-model.mjs`
- Modify: `server/roof-risk-repository.js`
- Test: `tests/roof-risk-chart-model.test.mjs`
- Test: `tests/roof-risk-api.test.mjs`

**Interfaces:**
- Produces `buildRoofRiskChartModel(current, history, events)` returning `{ thresholdTrend, probabilities, deviations, distribution }`.
- Extends each history point with `metrics` and returns the same `feature_schema` as the current endpoint.

- [ ] Write tests with fixed API-shaped fixtures proving timestamp parsing, P95 normalization, raw units, probability ordering, deviation naming, and risk distribution counts.
- [ ] Extend the repository history mapping with `metricsFor(record)` and `feature_schema`.
- [ ] Implement pure chart model builders without DOM or ECharts dependencies.
- [ ] Run `node --test tests/roof-risk-chart-model.test.mjs tests/roof-risk-api.test.mjs` and confirm all pass.
- [ ] Commit the data contract changes.

### Task 2: Shared ECharts lifecycle and truthful options

**Files:**
- Modify: `js/charts.js`
- Test: `tests/roof-risk-chart-model.test.mjs`
- Test: `tests/auth-frontend.test.mjs`

**Interfaces:**
- Produces `initPortalCharts()`, `updateRoofRiskCharts(payloads)`, `resizeCharts()`, and `disposeCharts()`.
- Consumes the pure model from Task 1 and the DOM IDs `thresholdTrendChart`, `regulatorDistributionChart`, `expertProbabilityChart`, and `expertDeviationChart`.

- [ ] Add static contract tests proving time axes, rich-text tooltips, ResizeObserver usage, theme registration, disposal, and absence of synthetic chart fixtures.
- [ ] Replace the three legacy simulated chart builders with four role-focused option builders and a registered `smartMineIndustrial` theme.
- [ ] Reuse existing instances with `echarts.getInstanceByDom`, observe non-zero containers, and resize newly visible portals.
- [ ] Use `dataset` for probability, deviation, and distribution bars; use time-value series for history.
- [ ] Run focused tests and commit the chart infrastructure.

### Task 3: Enterprise monitoring work surface

**Files:**
- Modify: `index.html`
- Modify: `js/main.js`
- Modify: `css/style.css`
- Test: `tests/auth-frontend.test.mjs`

**Interfaces:**
- Consumes current/history chart payloads and existing enterprise DOM renderers.
- Produces the metric rail, real risk command rail, threshold chart, and persistent provenance strip.

- [ ] Add DOM contract tests for the enterprise metric rail, provenance fields, chart state layer, and retained Three.js container.
- [ ] Restructure enterprise markup into left/scene/right tracks while preserving all IDs needed by scene and closed-loop behavior.
- [ ] Render all seven numeric metrics with value, unit, status text, P05-P95 reference, and position.
- [ ] Fetch real history with authenticated requests and pass it to the chart module.
- [ ] Implement desktop, medium, and mobile grid rules without modifying Three.js rendering configuration.
- [ ] Run focused tests and commit the enterprise dashboard.

### Task 4: Regulator and expert analysis work surfaces

**Files:**
- Modify: `index.html`
- Modify: `js/main.js`
- Modify: `css/style.css`
- Test: `tests/auth-frontend.test.mjs`

**Interfaces:**
- Regulator consumes `/events` plus selected current and closed-loop state.
- Expert consumes current/history probabilities, standardized evidence, labels, and provenance.

- [ ] Add DOM contract tests for regulator distribution, selected-event evidence, expert probability/deviation charts, and read-only viewer state.
- [ ] Recompose regulator UI as event queue, distribution/detail area, and supervision rail with explicit priority and closure status.
- [ ] Recompose expert UI around label agreement, four-class probability, standardized deviation, history, and evidence provenance.
- [ ] Remove duplicated CSS progress-bar visualizations replaced by charts, but retain accessible textual values.
- [ ] Ensure viewer sessions hide all mutation controls and retain analysis content.
- [ ] Run focused tests and commit both portals.

### Task 5: State handling, responsive polish, and full verification

**Files:**
- Modify: `js/main.js`
- Modify: `css/style.css`
- Create: `tools/capture-three-portal-ui-qa.cjs`
- Create: `docs/qa/2026-09-05-three-portal-ui-echarts-qa.md`

**Interfaces:**
- Produces deterministic screenshots and diagnostics for all three role layouts at desktop and mobile widths.

- [ ] Implement shared loading, empty, partial, and error state surfaces that clear stale chart data.
- [ ] Add visible focus, reduced-motion, long-text containment, stable chart heights, and 44px mobile controls.
- [ ] Start the local server and capture enterprise, regulator, and expert screenshots at 1440x900 and 390x844.
- [ ] Fail QA on unexpected `console.error`, `pageerror`, failed resources, blank canvas, overflow, duplicate ECharts instances, or zero-size charts.
- [ ] Verify chart resize after layout changes, tooltip text safety, page-wheel behavior, authenticated permissions, and retained Three.js visual fidelity.
- [ ] Run `npm test` and `npm run preflight:offline`; record results in the QA document.
- [ ] Remove current-task scratch screenshots and browser artifacts, keeping only the QA script and report.
- [ ] Commit, push `main`, and verify the production Vercel URL and deployment status.
