# Real Data Replay Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-width enterprise replay workbench that drives charts, model evidence, risk state, and Three.js from the same ordered records in the teacher-provided 20,000-row CSV artifact.

**Architecture:** The repository exposes immutable indexed replay frames and bounded history windows without mutating the globally selected event. A pure browser replay controller owns cursor, speed, loop, request serialization, and playback state; the enterprise UI renders each successful frame atomically into one workbench and forwards the same payload to the existing risk and Three.js adapters.

**Tech Stack:** Node.js 18+, vanilla JavaScript ES modules, Apache ECharts 6.1.0, Three.js 0.160.0, Node built-in test runner, Playwright visual QA.

## Global Constraints

- The only measurement source is the existing 20,000-row teacher CSV artifact.
- The interface must say `历史数据回放`; it must not describe replay as live sensor acquisition.
- No random, interpolated, or simulated measurement values may be introduced.
- A frame response owns one record ID across metrics, risk, model output, evidence, provenance, charts, and Three.js.
- Replay reads must not mutate selected events or closed-loop progress.
- Loop defaults to off; speeds are exactly `1x`, `2x`, and `5x`.
- Desktop and 390px mobile layouts must have no horizontal overflow or text overlap.

---

### Task 1: Immutable Replay Repository

**Files:**
- Modify: `server/roof-risk-repository.js`
- Modify: `tests/roof-risk-repository.test.mjs`

**Interfaces:**
- Produces: `repository.getReplayMeta(): ReplayMeta`
- Produces: `repository.getReplayFrame(index: number, windowSize: number): ReplayFrame`
- `ReplayMeta` contains `total`, `default_index`, `feature_schema`, `event_markers`, and `provenance`.
- `ReplayFrame` contains `index`, `total`, `has_previous`, `has_next`, `current`, and `history`.

- [ ] **Step 1: Write failing repository tests**

Add tests which assert:

```js
test('replay metadata exposes all real records and stable risk markers', () => {
  const meta = repository.getReplayMeta();
  assert.equal(meta.total, 20_000);
  assert.equal(meta.feature_schema.length, 8);
  assert.ok(meta.default_index >= 0 && meta.default_index < meta.total);
  assert.deepEqual(meta.event_markers.map((item) => item.risk_level), ['green', 'yellow', 'orange', 'red']);
});

test('replay frame is bounded, chronological, and does not mutate selected event', () => {
  const before = repository.getCurrent().event_id;
  const frame = repository.getReplayFrame(1750, 48);
  assert.equal(frame.index, 1750);
  assert.equal(frame.total, 20_000);
  assert.equal(frame.current.provenance.record_id, frame.current.model_output.record_id);
  assert.ok(frame.history.points.length <= 48);
  assert.ok(frame.history.points.every((point, index, points) => !index || points[index - 1].timestamp <= point.timestamp));
  assert.equal(repository.getCurrent().event_id, before);
});

test('replay frame rejects invalid indexes and clamps window size', () => {
  assert.throws(() => repository.getReplayFrame(-1, 48), /REPLAY_INDEX_OUT_OF_RANGE/);
  assert.throws(() => repository.getReplayFrame(20_000, 48), /REPLAY_INDEX_OUT_OF_RANGE/);
  assert.equal(repository.getReplayFrame(0, 10_000).history.points.length <= 120, true);
});
```

- [ ] **Step 2: Run the focused repository test and verify failure**

Run:

```powershell
& $node --test tests/roof-risk-repository.test.mjs
```

Expected: FAIL because `getReplayMeta` and `getReplayFrame` do not exist.

- [ ] **Step 3: Implement ordered replay access**

Inside `createRoofRiskRepository`, create an immutable `replayRecords` array sorted by parsed timestamp, device ID, then record ID. Implement:

```js
function getReplayMeta() {
  return {
    api_version: API_VERSION,
    data_source: DATA_SOURCE,
    total: replayRecords.length,
    default_index: replayRecords.findIndex((record) => record.id === artifact.representatives['重大风险']),
    feature_schema: artifact.feature_schema,
    event_markers: Object.entries(RISK_META).map(([label, meta]) => {
      const recordId = artifact.representatives[label];
      return {
        record_id: recordId,
        index: replayRecords.findIndex((record) => record.id === recordId),
        risk_level: meta.level,
        stage: meta.stage,
        timestamp: getRecord(recordId).time,
      };
    }),
    provenance: provenanceFor(replayRecords[0]),
  };
}
```

Implement `getReplayFrame(index, windowSize)` with integer validation, a maximum window of 120, a window ending at the current index, and `currentForEvent({ ...eventByLabel.get(record.predicted_class), recordId: record.id })`. Return history points using only `metricsFor(record)` and stored model fields.

- [ ] **Step 4: Run repository tests**

Run:

```powershell
& $node --test tests/roof-risk-repository.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit repository replay support**

```powershell
git add server/roof-risk-repository.js tests/roof-risk-repository.test.mjs
git commit -m "feat: expose immutable real-data replay frames"
```

---

### Task 2: Authenticated Replay API

**Files:**
- Modify: `server.js`
- Modify: `tests/roof-risk-api.test.mjs`

**Interfaces:**
- Consumes: `repository.getReplayMeta()` and `repository.getReplayFrame(index, windowSize)`.
- Produces: `GET /api/roof-risk/replay/meta`.
- Produces: `GET /api/roof-risk/replay/frame?index=N&window=48`.

- [ ] **Step 1: Write failing HTTP contract tests**

```js
test('authenticated replay endpoints expose metadata and a traceable frame', async () => {
  const client = await loginEnterprise();
  const meta = await client.get('/api/roof-risk/replay/meta');
  assert.equal(meta.status, 200);
  assert.equal(meta.payload.total, 20_000);
  const frame = await client.get(`/api/roof-risk/replay/frame?index=${meta.payload.default_index}&window=48`);
  assert.equal(frame.status, 200);
  assert.equal(frame.payload.current.provenance.record_id, frame.payload.current.model_output.record_id);
  assert.equal(frame.payload.history.feature_schema.length, 8);
});

test('replay endpoint rejects unauthenticated and invalid index requests', async () => {
  assert.equal((await request('/api/roof-risk/replay/meta')).status, 401);
  const client = await loginEnterprise();
  const invalid = await client.get('/api/roof-risk/replay/frame?index=nope');
  assert.equal(invalid.status, 400);
  assert.equal(invalid.payload.error.code, 'INVALID_REPLAY_INDEX');
});
```

- [ ] **Step 2: Run API tests and verify failure**

Run:

```powershell
& $node --test tests/roof-risk-api.test.mjs
```

Expected: FAIL with HTTP 404 for the replay routes.

- [ ] **Step 3: Add read-only routes**

Add the routes after the existing history route:

```js
if (pathname === '/api/roof-risk/replay/meta') {
  assertMethod(req, ['GET']);
  sendJson(res, repository.getReplayMeta());
  return;
}

if (pathname === '/api/roof-risk/replay/frame') {
  assertMethod(req, ['GET']);
  const index = Number(requestUrl.searchParams.get('index'));
  const windowSize = Number(requestUrl.searchParams.get('window') || 48);
  if (!Number.isInteger(index)) {
    throw new RoofRiskRepositoryError('INVALID_REPLAY_INDEX', 'index must be an integer', 400);
  }
  sendJson(res, repository.getReplayFrame(index, windowSize));
  return;
}
```

- [ ] **Step 4: Run API and authorization tests**

Run:

```powershell
& $node --test tests/roof-risk-api.test.mjs tests/auth-service.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit API routes**

```powershell
git add server.js tests/roof-risk-api.test.mjs
git commit -m "feat: add authenticated replay API"
```

---

### Task 3: Pure Replay Controller

**Files:**
- Create: `js/roof-risk-replay-controller.mjs`
- Create: `tests/roof-risk-replay-controller.test.mjs`

**Interfaces:**
- Produces: `createReplayController({ total, initialIndex, loadFrame, onFrame, onState, intervalMs })`.
- Produces methods: `play()`, `pause()`, `previous()`, `next()`, `seek(index)`, `setSpeed(speed)`, `setLoop(enabled)`, and `dispose()`.
- Emits state: `{ status, index, speed, loop, error }`.

- [ ] **Step 1: Write failing controller tests**

Use a deferred `loadFrame` spy and assert:

```js
test('controller serializes frame requests and applies only the requested cursor', async () => {
  const calls = [];
  const controller = createReplayController({
    total: 4,
    initialIndex: 1,
    intervalMs: 5,
    loadFrame: async (index) => { calls.push(index); return { index }; },
    onFrame: (frame) => applied.push(frame.index),
    onState: () => {},
  });
  await controller.seek(3);
  assert.deepEqual(calls, [3]);
  assert.deepEqual(applied, [3]);
});

test('controller supports exact speeds and stops at the final record by default', async () => {
  controller.setSpeed(5);
  controller.play();
  await clock.advance(10);
  assert.equal(controller.snapshot().index, 9);
  assert.equal(controller.snapshot().status, 'ended');
});
```

Also test invalid speeds, loop wrap, previous/next pausing, load failure producing `error`, and `dispose` clearing timers.

- [ ] **Step 2: Run controller tests and verify module-not-found failure**

Run:

```powershell
& $node --test tests/roof-risk-replay-controller.test.mjs
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the controller**

Use one timer and one in-flight promise. Accept only speeds in `new Set([1, 2, 5])`. Every manual navigation calls `pause()` first. A play tick calculates `Math.min(total - 1, index + speed)`; when loop is enabled and the increment crosses the end, wrap to `0`. Catch load errors, preserve the last applied frame, clear the timer, and emit `status: 'error'`.

- [ ] **Step 4: Run controller tests**

Run:

```powershell
& $node --test tests/roof-risk-replay-controller.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit the controller**

```powershell
git add js/roof-risk-replay-controller.mjs tests/roof-risk-replay-controller.test.mjs
git commit -m "feat: add deterministic replay controller"
```

---

### Task 4: Enterprise Replay Workbench UI

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `tests/three-portal-ui.test.mjs`

**Interfaces:**
- Produces DOM IDs: `replayWorkbench`, `replayStatus`, `replayIndex`, `replayTimestamp`, `replayRisk`, `replayMetricGrid`, `replayTrendChart`, `replayEventTrack`, `replayPrevious`, `replayPlayPause`, `replayNext`, `replaySeek`, `replaySpeed`, `replayLoop`, and replay provenance fields.

- [ ] **Step 1: Write failing UI contract tests**

```js
test('enterprise portal exposes an explicit real-history replay workbench', () => {
  const html = read('index.html');
  for (const id of ['replayWorkbench', 'replayTrendChart', 'replaySeek', 'replayPlayPause', 'replaySpeed', 'replayLoop']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /真实监测数据历史回放/);
  assert.doesNotMatch(html, /实时数据回放/);
});
```

Add CSS contract assertions for a full-width desktop workbench, stable chart height, and a 390px single-column breakpoint.

- [ ] **Step 2: Run UI tests and verify failure**

Run:

```powershell
& $node --test tests/three-portal-ui.test.mjs
```

Expected: FAIL because the workbench IDs do not exist.

- [ ] **Step 3: Add semantic workbench markup**

Place `<section id="replayWorkbench" class="replay-workbench">...</section>` after the provenance strip and before the footer. Use icon buttons with accessible labels for previous/play/next, a range input with `min="0"`, a segmented speed control containing only `1x`, `2x`, and `5x`, and a checkbox for looping.

- [ ] **Step 4: Add responsive industrial styling**

Use a full-width band rather than a nested card. For `body.portal-enterprise`, enable vertical page scrolling and give the existing `.main-container` a stable first-screen height with `flex: 0 0 calc(100vh - var(--enterprise-chrome-height))`; regulator and expert overflow behavior remains unchanged. The main analysis layout is `grid-template-columns: minmax(220px,.8fr) minmax(460px,1.8fr) minmax(220px,.8fr)`; at `max-width: 900px`, switch to one column. Give `#replayTrendChart` a stable `height: 320px` desktop and `260px` mobile. Preserve the existing cyan/yellow/red semantic palette and 5px-or-less radii.

- [ ] **Step 5: Run UI tests**

Run:

```powershell
& $node --test tests/three-portal-ui.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit workbench structure**

```powershell
git add index.html css/style.css tests/three-portal-ui.test.mjs
git commit -m "feat: add enterprise replay workbench"
```

---

### Task 5: Atomic Frame Rendering and ECharts Integration

**Files:**
- Modify: `js/charts.js`
- Modify: `js/main.js`
- Modify: `js/roof-risk-chart-model.mjs`
- Modify: `tests/charts-contract.test.mjs`
- Modify: `tests/roof-risk-chart-model.test.mjs`

**Interfaces:**
- Consumes: replay controller and `ReplayFrame`.
- Produces: `updateReplayChart({ current, history })`.
- Produces: `applyReplayFrame(frame)` in `main.js`.

- [ ] **Step 1: Write failing chart and controller integration contracts**

Assert that `CHART_IDS` includes `replayTrendChart`, the replay option uses a time axis and data zoom, `main.js` creates exactly one replay controller, and `applyReplayFrame` calls the existing render adapters with `frame.current`.

- [ ] **Step 2: Run focused frontend tests and verify failure**

Run:

```powershell
& $node --test tests/charts-contract.test.mjs tests/roof-risk-chart-model.test.mjs tests/three-portal-ui.test.mjs
```

Expected: FAIL because replay chart and integration functions are absent.

- [ ] **Step 3: Add the replay chart**

Reuse `thresholdTrendOption` with a workbench-specific configuration:

```js
export function updateReplayChart({ current = {}, history = {} } = {}) {
  const chart = chartFor('replayTrendChart');
  if (!chart) return null;
  const model = buildRoofRiskChartModel(current, history, {});
  const option = thresholdTrendOption(model, {
    seriesLimit: 7,
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 14, bottom: 4 }],
    showEndLabel: true,
  });
  chart.setOption(option, { notMerge: true });
  return model.thresholdTrend;
}
```

Refactor `thresholdTrendOption` to accept this options object while preserving the existing compact P95 chart.

- [ ] **Step 4: Implement atomic frame rendering**

In `applyReplayFrame(frame)`, derive one view model from `frame.current`, then synchronously update replay summary, metric list, event track, provenance, risk card, decision panel, P95 chart, and the existing `activeRoofValues` object used by Three.js. Set a `data-record-id` attribute on `replayWorkbench` after all updates complete.

- [ ] **Step 5: Wire controls and startup**

After authentication and role selection, enterprise users fetch replay metadata, create one controller, load `default_index`, and bind controls. Set range `max` to `meta.total - 1`. Update the play button icon and accessible label from controller state. Do not initialize replay controls for regulator, expert, viewer, or super administrator portals.

- [ ] **Step 6: Run focused and full tests**

Run:

```powershell
& $node --test tests/charts-contract.test.mjs tests/roof-risk-chart-model.test.mjs tests/three-portal-ui.test.mjs
& $node --test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit integrated replay behavior**

```powershell
git add js/charts.js js/main.js js/roof-risk-chart-model.mjs tests/charts-contract.test.mjs tests/roof-risk-chart-model.test.mjs
git commit -m "feat: synchronize real-data replay across enterprise views"
```

---

### Task 6: Browser QA, Data Preflight, and Delivery

**Files:**
- Modify: `tools/capture-three-portal-ui-qa.cjs`
- Create: `docs/qa/2026-09-05-real-data-replay-qa.md`

**Interfaces:**
- Consumes the completed production-like local server.
- Produces desktop/mobile screenshots, canvas pixel checks, control behavior results, and a concise QA record.

- [ ] **Step 1: Extend Playwright QA**

For the enterprise case, assert:

```js
await page.locator('#replayWorkbench').scrollIntoViewIfNeeded();
await page.locator('#replayTrendChart canvas').waitFor();
const firstRecord = await page.locator('#replayWorkbench').getAttribute('data-record-id');
await page.locator('#replayNext').click();
await expect.poll(() => page.locator('#replayWorkbench').getAttribute('data-record-id')).not.toBe(firstRecord);
await page.locator('[data-replay-speed="5"]').click();
await page.locator('#replayPlayPause').click();
```

Also verify pause stability, range seeking, no horizontal overflow, nonblank chart pixels, and that the visible label contains `历史回放`.

- [ ] **Step 2: Run browser QA at desktop and mobile sizes**

Run:

```powershell
& $node tools/capture-three-portal-ui-qa.cjs http://127.0.0.1:8517 tools/.generated/real-data-replay
```

Expected: six role/viewport cases PASS, with replay assertions passing for enterprise desktop and mobile.

- [ ] **Step 3: Run final data and repository verification**

Run:

```powershell
& $node tools/submission-preflight.mjs --offline
git diff --check
git status --short
```

Expected: 20,000 rows, expected SHA-256, preflight PASS, no whitespace errors, and only intended delivery files changed.

- [ ] **Step 4: Document QA evidence**

Record test totals, preflight row count/hash, desktop/mobile viewport dimensions, replay record change evidence, chart dimensions, and Three.js pixel variance in `docs/qa/2026-09-05-real-data-replay-qa.md`.

- [ ] **Step 5: Commit QA evidence**

```powershell
git add tools/capture-three-portal-ui-qa.cjs docs/qa/2026-09-05-real-data-replay-qa.md
git commit -m "test: verify real-data replay workbench"
```

- [ ] **Step 6: Push and verify deployment**

```powershell
git push origin main
```

Verify that Vercel reports the final commit as Production Ready, then log in to the production enterprise portal and confirm the replay workbench advances from one real record ID to the next.
