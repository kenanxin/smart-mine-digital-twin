# Expert Research Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a research-grade expert portal using real roof-risk samples, explainable charts, and a DeepSeek-optional expert advice workflow with deterministic local fallback.

**Architecture:** Extend the existing static expert portal and ECharts chart registry. Add a server-side advice endpoint that normalizes local and DeepSeek responses into one contract; keep API secrets server-only and make local rules the fallback. Preserve enterprise, regulator, and Three.js routes.

**Tech Stack:** Vanilla HTML/CSS/ES modules, Node.js HTTP server, ECharts 6, Node test runner.

## Global Constraints

- Use only real statistics derived from `data/roof-risk-dataset.json`; never add random chart data.
- Do not change enterprise/regulator behavior or enlarge the Three.js scene.
- `DEEPSEEK_API_KEY` is server-only; absent, invalid, timed out, or failed calls must fall back locally.
- Every chart must have a non-zero container, resize handling, and disposal through existing chart lifecycle helpers.

### Task 1: Add deterministic expert analytics model

**Files:**
- Create: `js/expert-research-model.mjs`
- Test: `tests/expert-research-model.test.mjs`
- Modify: `js/main.js: expert portal update path`

**Interfaces:**
- `buildExpertResearchModel({ current, history, explain })` returns `{ summary, distribution, contributions, heatmap, violins, trend, clusters, explanation }`.
- Each chart dataset carries `sourceLabel` and `sampleCount`.

- [ ] **Step 1: Write failing tests** for deterministic risk distribution, normalized feature distributions, and empty-history behavior.
- [ ] **Step 2: Run `node --test tests/expert-research-model.test.mjs` and verify failure.**
- [ ] **Step 3: Implement pure calculations** using the existing metric definitions and percentile reference values; use seeded ordering from source records and no random values.
- [ ] **Step 4: Update the expert portal state** to pass the model into chart updates and explanation rendering.
- [ ] **Step 5: Run the focused test and commit** `feat: add expert research analytics model`.

### Task 2: Build the dense research dashboard surface

**Files:**
- Modify: `index.html: expert portal section`
- Modify: `css/style.css: expert portal styles`
- Modify: `tests/three-portal-ui.test.mjs`

**Interfaces:**
- DOM IDs: `expertResearchNav`, `expertResearchSummary`, `expertDistributionChart`, `expertContributionChart`, `expertMechanismHeatmap`, `expertViolinChart`, `expertClusterChart`, `expertExplanation`, `expertAdvicePanel`.

- [ ] **Step 1: Add DOM contract assertions** for all research dashboard regions.
- [ ] **Step 2: Implement the left research navigation, summary strip, six chart containers, explanation layers, and advice panel** while preserving existing IDs used by current scripts.
- [ ] **Step 3: Add responsive dense-grid styles** with mobile single-column fallback and semantic risk colors.
- [ ] **Step 4: Run `node --test tests/three-portal-ui.test.mjs` and commit** `feat: add expert research dashboard layout`.

### Task 3: Extend ECharts registry and chart options

**Files:**
- Modify: `js/charts.js`
- Modify: `tests/charts-contract.test.mjs`

**Interfaces:**
- `updateExpertResearchCharts(model)` updates all six research chart instances using existing `initChart`, `resizeCharts`, and `disposeCharts` paths.

- [ ] **Step 1: Add chart IDs to the registry contract test.**
- [ ] **Step 2: Register bar, pie, heatmap, custom box/violin, line, and scatter options** with tooltips, units, legends, and empty states.
- [ ] **Step 3: Use merge updates for data-only refreshes and dispose on teardown.**
- [ ] **Step 4: Run `node --test tests/charts-contract.test.mjs tests/expert-research-model.test.mjs` and commit** `feat: visualize expert research analytics`.

### Task 4: Add local/DeepSeek expert advice API

**Files:**
- Create: `server/expert-advice-service.js`
- Modify: `server.js`
- Create: `tests/expert-advice-service.test.mjs`
- Modify: `tests/roof-risk-api.test.mjs`

**Interfaces:**
- `createExpertAdviceService({ fetchImpl, apiKey, endpoint, timeoutMs })` exposes `generate(input)`.
- `POST /api/roof-risk/expert-advice` returns `{ source, generatedAt, riskLevel, summary, recommendations, evidence, timeHorizon }`.

- [ ] **Step 1: Write tests** for local generation, missing key, successful DeepSeek normalization, timeout/error fallback, and malformed response fallback.
- [ ] **Step 2: Implement bounded request validation** and deterministic local advice based on risk score, probability, deviations, and active loop state.
- [ ] **Step 3: Implement server-only DeepSeek call** with timeout, response validation, and fallback.
- [ ] **Step 4: Wire auth-protected route in `server.js`.**
- [ ] **Step 5: Run focused API tests and commit** `feat: add resilient expert advice endpoint`.

### Task 5: Connect interactions and complete QA

**Files:**
- Modify: `js/main.js`
- Modify: `css/style.css`
- Create: `tests/expert-advice-ui.test.mjs`

- [ ] **Step 1: Add the advice button handler** with loading, success, error, source badge, and clipboard states.
- [ ] **Step 2: Add nav buttons** that scroll to or focus the corresponding research section without breaking the portal URL.
- [ ] **Step 3: Add UI contract tests** for fallback source labeling and advice rendering.
- [ ] **Step 4: Run `npm test` and `npm run preflight:offline`.**
- [ ] **Step 5: Start the local server and verify expert portal at desktop and mobile sizes; commit** `feat: complete expert research dashboard workflow`.

### Task 6: Final review and delivery

- [ ] **Step 1: Inspect `git diff` and verify no secret or random data is committed.**
- [ ] **Step 2: Run the full test suite and record counts.**
- [ ] **Step 3: Push the completed commits to `origin/main` only after local verification.**
- [ ] **Step 4: Report the local and production URLs plus DeepSeek configuration behavior.**
