# Orange Warning Collaboration Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, same-browser orange-warning demonstration that carries one real CSV/XGBoost event through enterprise disposal, regulator verification, expert explanation, and case archival.

**Architecture:** A pure state engine owns the seven-state workflow and persists versioned JSON in `localStorage`; a small IndexedDB adapter stores evidence images. A role-aware UI controller renders the same event into the existing three portals without reinitializing Three.js. The server remains authoritative only for source records, model evidence, similar-case search, and DeepSeek advice.

**Tech Stack:** Browser ES modules, localStorage, IndexedDB, Node.js HTTP server, existing RoofRisk repository, vanilla HTML/CSS, Node test runner, Playwright QA tooling.

## Global Constraints

- Trigger record is `REC-202511101149-02909`; comparison record is `REC-202511101153-02911`.
- Teacher CSV values and XGBoost output must remain unchanged and traceable to source hash `86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A`.
- Comparison wording must not imply that the observed change was caused by the demonstration treatment.
- Workflow state must survive logout, account switching, and page refresh in the same browser.
- Three.js must not be recreated or refocused when workflow state changes.
- Photos: JPEG/PNG/WebP only, maximum 5 MB each, maximum 4 images, at least 1 required for enterprise submission.
- No CSS gradients; Chrome 1366x768 must have no overlap or horizontal overflow.

---

### Task 1: Versioned Warning Workflow State Engine

**Files:**
- Create: `js/warning-demo-state.mjs`
- Create: `tests/warning-demo-state.test.mjs`

**Interfaces:**
- Produces: `DEMO_STATES`, `DEMO_ACTIONS`, `createInitialDemoState(now)`, `reduceDemoState(state, action, context)`, `createWarningDemoStore({ storage, now })`.
- State includes `version`, `eventId`, `sourceRecordId`, `comparisonRecordId`, `status`, `disposal`, `review`, `archive`, `timeline`, and `updatedAt`.

- [ ] **Step 1: Write failing state-transition tests**

```js
const store = createWarningDemoStore({ storage: memoryStorage(), now: clock });
store.dispatch({ type: 'START_DEMO', actor: enterprise });
assert.equal(store.getState().status, 'alert_triggered');
assert.throws(() => store.dispatch({ type: 'APPROVE', actor: enterprise }), /ACTION_NOT_ALLOWED/);
```

Cover the happy path, rejection/resubmission branch, role restrictions, required evidence metadata, persistence reload, corrupt JSON recovery, and reset.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/warning-demo-state.test.mjs`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement pure reducer and storage adapter**

Use exact transitions `ready -> alert_triggered -> disposal_in_progress -> pending_review -> changes_requested|verified -> archived`. Reject unknown actions, wrong roles, and missing required fields with coded errors. Dispatch a `smart-mine-warning-demo` CustomEvent after a successful save and listen for the browser `storage` event.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/warning-demo-state.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/warning-demo-state.mjs tests/warning-demo-state.test.mjs
git commit -m "feat: add orange warning demo state engine"
```

### Task 2: Evidence Photo Storage

**Files:**
- Create: `js/warning-demo-media.mjs`
- Create: `tests/warning-demo-media.test.mjs`

**Interfaces:**
- Produces: `validateEvidenceFiles(files)`, `createWarningDemoMediaStore({ indexedDB })` with `put(eventId, file)`, `list(eventId)`, `remove(eventId, id)`, and `clear(eventId)`.
- Consumes: Event id from Task 1; state stores only photo ids and metadata, never base64 payloads.

- [ ] **Step 1: Write failing validation tests**

```js
assert.equal(validateEvidenceFiles([{ type: 'image/jpeg', size: 1024 }]).valid, true);
assert.equal(validateEvidenceFiles([{ type: 'application/pdf', size: 1024 }]).code, 'UNSUPPORTED_TYPE');
assert.equal(validateEvidenceFiles([{ type: 'image/png', size: 5 * 1024 * 1024 + 1 }]).code, 'FILE_TOO_LARGE');
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test tests/warning-demo-media.test.mjs`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the IndexedDB adapter**

Create database `smart-mine-warning-demo`, object store `evidence`, and index `eventId`. Return object URLs only at render time and expose a `revokePreviewUrls` helper.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/warning-demo-media.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/warning-demo-media.mjs tests/warning-demo-media.test.mjs
git commit -m "feat: persist warning demo evidence photos"
```

### Task 3: Real Similar-Case Search API

**Files:**
- Modify: `server/roof-risk-repository.js`
- Modify: `server.js`
- Modify: `tests/roof-risk-repository.test.mjs`
- Modify: `tests/roof-risk-api.test.mjs`

**Interfaces:**
- Produces: `repository.findSimilarCases(recordId, limit = 3)` and authenticated `GET /api/roof-risk/similar-cases?record_id=...&limit=3`.
- Returns: `{ source, source_sha256, query_record_id, method, cases: [{ record_id, timestamp, device_id, true_class, predicted_class, risk_score, distance, similarity }] }`.

- [ ] **Step 1: Add failing repository and route tests**

```js
const result = repo.findSimilarCases('REC-202511101149-02909', 3);
assert.equal(result.cases.length, 3);
assert.ok(result.cases.every(item => item.record_id !== result.query_record_id));
assert.ok(result.cases.every((item, index, all) => index === 0 || all[index - 1].distance <= item.distance));
```

API tests must verify authentication, 400 for a missing id, 404 for an unknown id, limit clamping to 1-10, and provenance fields.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test tests/roof-risk-repository.test.mjs tests/roof-risk-api.test.mjs`
Expected: FAIL on the missing method and route.

- [ ] **Step 3: Implement deterministic distance search and route**

Calculate Euclidean distance over the seven `standardized_values`, exclude the query record, sort by distance then record id, and map similarity as `1 / (1 + distance)`. Do not return raw 20,000-row data.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/roof-risk-repository.test.mjs tests/roof-risk-api.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/roof-risk-repository.js server.js tests/roof-risk-repository.test.mjs tests/roof-risk-api.test.mjs
git commit -m "feat: expose real similar roof risk cases"
```

### Task 4: Three-Portal Demo Markup and Visual System

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `tests/three-portal-ui.test.mjs`

**Interfaces:**
- Produces stable DOM ids consumed by Task 5: `warningDemoLauncher`, `warningDemoStatus`, `enterpriseWarningDialog`, `enterpriseDisposalDrawer`, `enterpriseDisposalForm`, `regulatorDemoBanner`, `regulatorVerificationPanel`, `expertDemoEventStrip`, `expertSimilarCases`, `expertArchiveAction`, and `warningDemoTimeline` role-specific mirrors.

- [ ] **Step 1: Add failing DOM/CSS contract tests**

Assert every id exists once, dialogs have labels/focus targets, form inputs have labels, file input has `accept="image/jpeg,image/png,image/webp"`, the workflow rail defines seven stable nodes, and Chrome layouts define bounded dialog/drawer sizes without gradients.

- [ ] **Step 2: Run focused test and verify failure**

Run: `node --test tests/three-portal-ui.test.mjs`
Expected: FAIL on missing demo landmarks.

- [ ] **Step 3: Add semantic markup**

Place a compact shared event strip below the header; use a modal only for first enterprise alert, an overlay drawer for enterprise disposal, an in-flow regulator verification panel, and an in-flow expert event/case panel. Avoid adding new sidebars.

- [ ] **Step 4: Add responsive industrial styling**

Use existing tokens, orange for the current warning, cyan for provenance, green for approval, and red only for rejection. Keep the Three.js container dimensions independent from workflow DOM updates. Add visible focus, reduced-motion handling, and `overflow-wrap` for record ids.

- [ ] **Step 5: Run focused test**

Run: `node --test tests/three-portal-ui.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add index.html css/style.css tests/three-portal-ui.test.mjs
git commit -m "feat: add three-portal warning demo workspace"
```

### Task 5: Role-Aware Demo Controller

**Files:**
- Create: `js/warning-demo-ui.mjs`
- Modify: `js/main.js`
- Modify: `js/auth-client.mjs`
- Create: `tests/warning-demo-ui.test.mjs`
- Modify: `tests/auth-frontend.test.mjs`

**Interfaces:**
- Consumes: Task 1 store, Task 2 media adapter, Task 3 API, authenticated user from `initApp(user)`.
- Produces: `setupWarningDemo({ user, currentRisk, authFetch })`, `refreshWarningDemoRisk(payload)`, and `destroyWarningDemo()`.

- [ ] **Step 1: Add failing role and controller tests**

Verify enterprise-only start/submit/reset, regulator-only approve/reject, expert-only archive, state restoration after a simulated login switch, one-time alert behavior, required form validation, HTML escaping, and no calls to the Three.js scene adapter.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test tests/warning-demo-ui.test.mjs tests/auth-frontend.test.mjs`
Expected: FAIL because the controller is missing.

- [ ] **Step 3: Implement renderers and action binding**

Render all text with `textContent` or an escaping helper. On `START_DEMO`, select `REAL-MAJOR-001`, display the fixed source record, and open the first-alert dialog once per event revision. Enterprise submission must await successful media persistence before dispatching state.

- [ ] **Step 4: Integrate current risk, comparison, similar cases, and advice**

Fetch the comparison with `POST /api/roof-risk/evaluate` and body `{ "record_id": "REC-202511101153-02911" }` using the existing route contract, fetch Task 3 similar cases, and pass the workflow summary into the existing expert-advice request. Label sources explicitly.

- [ ] **Step 5: Integrate without scene refresh**

Initialize the demo controller once after authentication. Pass refreshed risk payloads into `refreshWarningDemoRisk` without calling camera presets, scene creation, or `renderStageClosedLoop`.

- [ ] **Step 6: Run focused tests**

Run: `node --test tests/warning-demo-ui.test.mjs tests/auth-frontend.test.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add js/warning-demo-ui.mjs js/main.js js/auth-client.mjs tests/warning-demo-ui.test.mjs tests/auth-frontend.test.mjs
git commit -m "feat: connect orange warning demo across roles"
```

### Task 6: Full Verification and Chrome QA

**Files:**
- Create: `tools/capture-warning-demo-qa.cjs`
- Create: `docs/qa/2026-09-07-orange-warning-demo-qa.md`
- Modify only if defects are found: files from Tasks 1-5.

**Interfaces:**
- Produces reproducible screenshots and a QA record for the complete role-switch flow.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`
Expected: all tests PASS with no skipped new workflow tests.

- [ ] **Step 2: Run project preflight**

Run: `npm run preflight:offline`
Expected: PASS for source data, assets, server routes, and production files.

- [ ] **Step 3: Exercise the complete Chrome flow**

At 1366x768 and 1920x1080: reset; start orange warning; acknowledge; upload a fixture image and submit; log in regulator; reject with deadline; log in enterprise and resubmit; log in regulator and approve; log in expert; generate advice; archive. Confirm no overlap, no horizontal overflow, persistent evidence count, correct timestamps, and unchanged Three.js camera framing.

- [ ] **Step 4: Document evidence and defects fixed**

Record tested URLs, viewport dimensions, state sequence, source record ids, screenshot paths, console errors, and final test counts in the QA document.

- [ ] **Step 5: Final commit**

```bash
git add tools/capture-warning-demo-qa.cjs docs/qa/2026-09-07-orange-warning-demo-qa.md
git commit -m "test: verify orange warning collaboration demo"
```
