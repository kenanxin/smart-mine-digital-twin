# Mine V2 Balanced Cutaway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated, meter-scale Three.js mine scene whose first viewport matches the approved balanced surface/geology/underground composition while preserving the current scene until Mine V2 passes visual and data validation.

**Architecture:** Mine V2 lives under `js/scene/mine-v2/` and returns the same `root`, `runtime`, and `cameraPresets` contract consumed by `scene.js`, plus control limits and diagnostics. Pure `.mjs` modules own dimensions, topology, seeded simulation, and validation so Node's built-in test runner can verify them without loading Three.js; renderer-facing `.js` modules convert those records into meshes.

**Tech Stack:** Three.js 0.160, native ES modules, CSS2DRenderer, Node built-in `node:test`, the existing static Node server, and in-app browser visual QA.

## Global Constraints

- Keep `/` on the existing scene until Mine V2 passes validation; expose Mine V2 at `/?scene=v2`.
- Do not modify, stage, or commit the user's current changes in `js/scene/integrated-mine.js`.
- Use `1 Three.js unit = 1 meter`.
- Use a visible mine extent of about `900m x 520m` and a visible underground depth of about `210m`.
- Place the three production horizons at `-45m`, `-95m`, and `-155m`.
- Keep the first viewport near `44% surface / 8% geology transition / 48% underground`.
- Use a terraced-valley underground coal mine campus, not a large open-pit mine.
- Keep roadways embedded in continuous rock; no floating decks, rectangular stratum shelves, facade holes, or one giant underground cavern.
- Keep the current UI functional; defer Vue3 migration and full UI restyling.
- Treat all thresholds and values as competition simulation data, not production safety standards.
- Target at least `40 FPS` at `1920x1080` after structural validation.

---

## File Structure

### Pure, testable modules

- `js/scene/mine-v2/config.mjs`: immutable meter-scale dimensions, camera targets, feature IDs, and quality limits.
- `js/scene/mine-v2/topology.mjs`: roadway centerlines, connection graph, and route sampling.
- `js/scene/mine-v2/terrain-profile.mjs`: deterministic height and grading functions.
- `js/scene/mine-v2/camera-presets.mjs`: four camera presets and per-mode orbit limits.
- `js/scene/mine-v2/monitor-layout.mjs`: topology-derived sensor, camera, and person anchors.
- `js/scene/mine-v2/simulator.mjs`: seeded continuous monitoring values and registry summaries.
- `js/scene/mine-v2/validate.mjs`: structural and data consistency diagnostics.

### Renderer-facing modules

- `js/scene/mine-v2/mine-v2.js`: scene assembly and public runtime contract.
- `js/scene/mine-v2/terrain.js`: height-field terrain, terraces, and roads.
- `js/scene/mine-v2/cutaway-geology.js`: continuous rock volume, coal seam, and irregular cutaway frame.
- `js/scene/mine-v2/roadway-network.js`: arched roadway shells, floors, ribs, lights, pipes, and chambers.
- `js/scene/mine-v2/surface-campus.js`: portal, processing plant, conveyors, buildings, and surface fleet anchors.
- `js/scene/mine-v2/working-face.js`: 1206 face volume, two gates, and equipment attachment points.
- `js/scene/mine-v2/labels.js`: CSS2D labels and visibility tiers.
- `js/scene/mine-v2/materials.js`: clones and scale-corrects the existing licensed PBR materials.
- `js/scene/mine-v2/scene-adapter.js`: stable role lookup and compatibility with current disaster/runtime APIs.

### Integration and verification

- `js/scene.js`: query-param scene selection, larger camera frustum, dynamic control limits, and diagnostics exposure.
- `tests/mine-v2-config.test.mjs`: dimensions, topology, deterministic terrain, simulation, and validation tests.
- `docs/qa/mine-v2-validation.md`: final screenshots, viewport results, object counts, FPS, and unresolved visual differences.

---

### Task 1: Meter-Scale Configuration and Topology Contract

**Files:**
- Create: `js/scene/mine-v2/config.mjs`
- Create: `js/scene/mine-v2/topology.mjs`
- Create: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: `MINE_V2_CONFIG`, `ROADWAY_NODES`, `ROADWAY_EDGES`, `sampleEdge(edgeId, t)`, and `getConnectedNodeIds(nodeId)`.
- Consumes: no renderer objects or DOM APIs.

- [ ] **Step 1: Write failing dimension and connectivity tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { MINE_V2_CONFIG } from '../js/scene/mine-v2/config.mjs';
import { ROADWAY_NODES, ROADWAY_EDGES, getConnectedNodeIds, sampleEdge } from '../js/scene/mine-v2/topology.mjs';

test('mine uses the approved meter-scale dimensions', () => {
  assert.deepEqual(MINE_V2_CONFIG.world, { width: 900, depth: 520, undergroundDepth: 210 });
  assert.deepEqual(MINE_V2_CONFIG.horizons, [-45, -95, -155]);
  assert.equal(MINE_V2_CONFIG.workingFace.length, 140);
});

test('main incline reaches all three production horizons', () => {
  for (const id of ['h1-junction', 'h2-junction', 'h3-junction']) {
    assert.ok(ROADWAY_NODES.some(node => node.id === id));
    assert.ok(getConnectedNodeIds(id).length >= 2);
  }
});

test('edge sampling returns exact endpoints', () => {
  const edge = ROADWAY_EDGES.find(item => item.id === 'main-incline-h1');
  assert.deepEqual(sampleEdge(edge.id, 0), ROADWAY_NODES.find(node => node.id === edge.from).position);
  assert.deepEqual(sampleEdge(edge.id, 1), ROADWAY_NODES.find(node => node.id === edge.to).position);
});
```

- [ ] **Step 2: Run the tests and verify the expected failure**

Run: `node --test tests/mine-v2-config.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `config.mjs`.

- [ ] **Step 3: Implement immutable configuration**

```js
export const MINE_V2_CONFIG = Object.freeze({
  seed: 20260728,
  world: Object.freeze({ width: 900, depth: 520, undergroundDepth: 210 }),
  horizons: Object.freeze([-45, -95, -155]),
  workingFace: Object.freeze({ id: 'working-face-1206', length: 140, width: 34, height: 5.2 }),
  roadway: Object.freeze({ minWidth: 4.5, maxWidth: 6.5, defaultHeight: 4.6 }),
  composition: Object.freeze({ surface: 0.44, transition: 0.08, underground: 0.48 }),
  performance: Object.freeze({ targetFps: 40, maxLabelsOverview: 10 }),
});
```

- [ ] **Step 4: Implement the connected topology records and helpers**

Use immutable nodes for `portal`, three horizon junctions, two chambers, two lower gate ends, and the face. Define edges for the main incline, three main levels, return airway, gate roads, and true crosscuts. Implement `sampleEdge` as clamped linear interpolation over edge points and `getConnectedNodeIds` from `from`/`to` IDs.

```js
export function sampleEdge(edgeId, t) {
  const edge = requireEdge(edgeId);
  const clamped = Math.min(1, Math.max(0, t));
  const points = edge.points ?? [requireNode(edge.from).position, requireNode(edge.to).position];
  const scaled = clamped * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const local = scaled - index;
  return points[index].map((value, axis) => value + (points[index + 1][axis] - value) * local);
}
```

- [ ] **Step 5: Run the unit tests**

Run: `node --test tests/mine-v2-config.test.mjs`

Expected: 3 tests PASS.

- [ ] **Step 6: Commit only Task 1 files**

```powershell
git add -- js/scene/mine-v2/config.mjs js/scene/mine-v2/topology.mjs tests/mine-v2-config.test.mjs
git commit -m "feat: define mine v2 meter-scale topology"
```

---

### Task 2: Isolated Mine V2 Entry and Runtime Contract

**Files:**
- Create: `js/scene/mine-v2/camera-presets.mjs`
- Create: `js/scene/mine-v2/mine-v2.js`
- Modify: `js/scene.js:16-18, 58-102, 162-198, 810-853, 1256-1275`
- Modify: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Consumes: `MINE_V2_CONFIG` and topology records from Task 1; existing `loadMineMaterials()`.
- Produces: `buildMineV2(sourceMaterials)` returning `{ root, runtime, cameraPresets, controlLimits, validation }`.

- [ ] **Step 1: Add a failing contract-shape test for a pure descriptor**

Test the pure camera module without importing Three.js:

```js
import { CAMERA_PRESETS, CONTROL_LIMITS } from '../js/scene/mine-v2/camera-presets.mjs';

test('mine v2 descriptor exposes four camera modes and control limits', () => {
  assert.deepEqual(Object.keys(CAMERA_PRESETS), ['overview', 'surface', 'underground', 'workingFace']);
  assert.ok(CONTROL_LIMITS.overview.maxDistance >= 700);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/mine-v2-config.test.mjs`

Expected: FAIL because `camera-presets.mjs` does not exist.

- [ ] **Step 3: Add exact camera and control descriptors**

Create `camera-presets.mjs` with these immutable exports so `scene.js` does not invent scale-dependent limits:

```js
export const CAMERA_PRESETS = Object.freeze({
    overview: Object.freeze({ position: [620, 285, 690], target: [20, -58, -70], fov: 34 }),
    surface: Object.freeze({ position: [470, 250, 360], target: [190, 18, -55], fov: 36 }),
    underground: Object.freeze({ position: [390, -5, 390], target: [5, -100, -95], fov: 35 }),
    workingFace: Object.freeze({ position: [205, -118, 175], target: [40, -153, -125], fov: 34 }),
});

export const CONTROL_LIMITS = Object.freeze({
    overview: Object.freeze({ minDistance: 460, maxDistance: 1050, minAzimuth: -0.8, maxAzimuth: 0.8 }),
    surface: Object.freeze({ minDistance: 180, maxDistance: 700, minAzimuth: -1.2, maxAzimuth: 1.2 }),
    underground: Object.freeze({ minDistance: 180, maxDistance: 650, minAzimuth: -0.95, maxAzimuth: 0.95 }),
    workingFace: Object.freeze({ minDistance: 75, maxDistance: 300, minAzimuth: -0.7, maxAzimuth: 0.7 }),
});
```

- [ ] **Step 4: Add the exact Mine V2 runtime skeleton**

```js
export function buildMineV2(sourceMaterials) {
  const root = new THREE.Group();
  root.name = 'mineV2BalancedCutaway';
  const runtime = {
    variant: 'v2',
    labels: [],
    monitorMarkers: [],
    routeVehicles: [],
    update() {},
    dispose() {},
  };
  return {
    root,
    runtime,
    cameraPresets: CAMERA_PRESETS,
    controlLimits: CONTROL_LIMITS,
    validation: { variant: 'v2', errors: [], warnings: [] },
  };
}
```

- [ ] **Step 5: Select the builder by query parameter without changing the default**

In `scene.js`, import `buildMineV2`, set the camera far plane to `2000`, and replace the direct builder call with:

```js
const requestedVariant = new URLSearchParams(window.location.search).get('scene');
const isMineV2 = requestedVariant === 'v2';
const mine = isMineV2 ? buildMineV2(materials) : buildIntegratedMine(materials);
window.__mineDiagnostics = { variant: isMineV2 ? 'v2' : 'legacy', validation: mine.validation ?? null };
```

Apply `mine.controlLimits?.[mode]` in `applyCameraPreset`; retain the legacy numeric limits when no Mine V2 limits exist.

- [ ] **Step 6: Run unit tests and HTTP smoke checks**

Run:

```powershell
node --test tests/mine-v2-config.test.mjs
Invoke-WebRequest http://localhost:8080/ -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest 'http://localhost:8080/?scene=v2' -UseBasicParsing | Select-Object StatusCode
```

Expected: tests PASS and both requests return `200`.

- [ ] **Step 7: Browser smoke-test both variants**

Open `/` and `/?scene=v2`; confirm `window.__mineDiagnostics.variant` equals `legacy` and `v2` respectively, and each canvas contains non-background pixels.

- [ ] **Step 8: Commit Task 2 files only**

```powershell
git add -- js/scene.js js/scene/mine-v2/mine-v2.js js/scene/mine-v2/camera-presets.mjs tests/mine-v2-config.test.mjs
git commit -m "feat: add isolated mine v2 preview entry"
```

---

### Task 3: Deterministic Terrain and Continuous Cutaway Geology

**Files:**
- Create: `js/scene/mine-v2/terrain-profile.mjs`
- Create: `js/scene/mine-v2/materials.js`
- Create: `js/scene/mine-v2/terrain.js`
- Create: `js/scene/mine-v2/cutaway-geology.js`
- Modify: `js/scene/mine-v2/mine-v2.js`
- Modify: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: `getTerrainHeight(x, z)`, `getGradedHeight(x, z)`, `buildTerrain(materials)`, `buildCutawayGeology(materials)`, and `createMineV2Materials(sourceMaterials)`.
- Consumes: `MINE_V2_CONFIG.seed` and existing licensed material maps.

- [ ] **Step 1: Add failing determinism and grading tests**

```js
import { getTerrainHeight, getGradedHeight } from '../js/scene/mine-v2/terrain-profile.mjs';

test('terrain is deterministic and the campus pad is level', () => {
  assert.equal(getTerrainHeight(120, -80), getTerrainHeight(120, -80));
  assert.equal(getGradedHeight(250, -60), getGradedHeight(310, -20));
});
```

- [ ] **Step 2: Run and verify module-not-found failure**

Run: `node --test tests/mine-v2-config.test.mjs`

Expected: FAIL for `terrain-profile.mjs`.

- [ ] **Step 3: Implement seeded macro terrain and a smooth industrial pad**

Use three low-frequency sine bands plus a radial valley term. Blend to a fixed pad elevation with a smoothstep distance field; do not use per-frame randomness.

```js
export function getGradedHeight(x, z) {
  const natural = getTerrainHeight(x, z);
  const dx = Math.max(Math.abs(x - 270) - 85, 0);
  const dz = Math.max(Math.abs(z + 45) - 60, 0);
  const distance = Math.hypot(dx, dz);
  const blend = smoothstep(0, 32, distance);
  return 18 * (1 - blend) + natural * blend;
}
```

- [ ] **Step 4: Build the renderer terrain and continuous rock frame**

Create one displaced terrain mesh and one irregular cutaway geology group. The cutaway group must include side shoulders, a deep back mass, bottom foundation, a coal seam band, and rubble at the open edge. It must not create a sphere/cavern enclosing the underground network.

- [ ] **Step 5: Reuse and scale existing PBR maps**

Clone source materials, set rock/ground texture wrapping and repeat values in meter scale, preserve independent normal/ARM maps, and expose `rock`, `darkRock`, `coal`, `road`, `concrete`, `steel`, `rubber`, `glass`, and `lamp`.

- [ ] **Step 6: Run tests and browser composition check**

Run: `node --test tests/mine-v2-config.test.mjs`

Open `/?scene=v2` and verify the surface, transition, and underground opening occupy approximately 44/8/48 of the center canvas. Confirm no rectangular layer shelves or giant cavern are visible.

- [ ] **Step 7: Commit Task 3 files**

```powershell
git add -- js/scene/mine-v2/terrain-profile.mjs js/scene/mine-v2/materials.js js/scene/mine-v2/terrain.js js/scene/mine-v2/cutaway-geology.js js/scene/mine-v2/mine-v2.js tests/mine-v2-config.test.mjs
git commit -m "feat: build mine v2 terrain and geology"
```

---

### Task 4: Three-Horizon Roadway Network

**Files:**
- Create: `js/scene/mine-v2/roadway-network.js`
- Create: `js/scene/mine-v2/validate.mjs`
- Modify: `js/scene/mine-v2/mine-v2.js`
- Modify: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: `buildRoadwayNetwork(materials, runtime)` and `validateTopology(nodes, edges)`.
- Consumes: topology nodes/edges and material bundle.

- [ ] **Step 1: Add failing validation tests**

```js
import { validateTopology } from '../js/scene/mine-v2/validate.mjs';

test('approved topology has no missing endpoints and all horizons are reachable', () => {
  const report = validateTopology(ROADWAY_NODES, ROADWAY_EDGES);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.unreachableNodeIds, []);
});

test('validator rejects a disconnected edge', () => {
  const report = validateTopology(ROADWAY_NODES, [...ROADWAY_EDGES, { id: 'bad', from: 'missing', to: 'portal' }]);
  assert.ok(report.errors.some(message => message.includes('missing')));
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/mine-v2-config.test.mjs`

Expected: FAIL for missing `validate.mjs`.

- [ ] **Step 3: Implement graph validation with breadth-first traversal**

Return `{ errors, unreachableNodeIds }`. Validate unique IDs, endpoint existence, edge point counts, roadway widths in the 4.5m-6.5m range, and reachability from `portal`.

- [ ] **Step 4: Generate real arched roadway interiors along 3D curves**

For each edge, build a curve-aligned group containing floor, back/side rock shell, steel ribs, lights, pipes, drainage, and optional track/belt. Keep the camera-facing cut edge open while maintaining roof, sidewall, and deep rock contact.

- [ ] **Step 5: Build true junctions and chambers**

Use node-based widened junction geometry at actual shared coordinates. Build pump and substation chambers only at their topology nodes, with floors and rock enclosure connected to the second horizon.

- [ ] **Step 6: Run tests and inspect three non-degenerate views**

Run: `node --test tests/mine-v2-config.test.mjs`

In the browser, inspect overview plus two allowed orbit angles. Verify depth does not collapse, all tunnel mouths remain connected, and no roadway is supported by a floating slab.

- [ ] **Step 7: Commit Task 4 files**

```powershell
git add -- js/scene/mine-v2/roadway-network.js js/scene/mine-v2/validate.mjs js/scene/mine-v2/mine-v2.js tests/mine-v2-config.test.mjs
git commit -m "feat: add connected three-horizon roadways"
```

---

### Task 5: Terraced-Valley Surface Campus and Grounded Routes

**Files:**
- Create: `js/scene/mine-v2/surface-campus.js`
- Modify: `js/scene/mine-v2/terrain.js`
- Modify: `js/scene/mine-v2/topology.mjs`
- Modify: `js/scene/mine-v2/mine-v2.js`
- Modify: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: `buildSurfaceCampus(materials, runtime, getGroundHeight)` and `SURFACE_ROUTES`.
- Consumes: terrain height query and runtime vehicle registry.

- [ ] **Step 1: Add failing route grounding tests**

```js
import { SURFACE_ROUTES } from '../js/scene/mine-v2/topology.mjs';

test('surface routes are closed and every point carries a terrain-relative offset', () => {
  for (const route of SURFACE_ROUTES) {
    assert.deepEqual(route.points[0], route.points.at(-1));
    assert.ok(route.points.every(point => point.length === 3));
  }
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/mine-v2-config.test.mjs`

Expected: FAIL because `SURFACE_ROUTES` is undefined.

- [ ] **Step 3: Implement two closed road centerlines**

Define one service loop and one haul loop. At mesh-build time, resolve every point's Y value with `getGroundHeight(x, z) + 0.12`.

- [ ] **Step 4: Build the portal and industrial campus**

Place the portal at the exact `portal` node, then add the processing building, transfer tower, conveyor bridge, auxiliary workshops, silos, and utility yard on the graded pad. Use realistic meter dimensions and separate concrete, painted steel, glass, and roof materials.

- [ ] **Step 5: Add mid-distance fleet anchors**

Reuse existing vehicle construction only through copied/adapted factories in Mine V2 modules; register wheels and route progress. Use speeds between `0.8m/s` and `2.0m/s`, compute wheel rotation as signed traveled distance divided by radius, and query ground height every update.

- [ ] **Step 6: Run tests and browser grounding inspection**

Run: `node --test tests/mine-v2-config.test.mjs`

Inspect at least start, midpoint, and curve sections of each route. Verify wheels touch roads, buildings sit on the pad, and roads do not enter the cutaway void.

- [ ] **Step 7: Commit Task 5 files**

```powershell
git add -- js/scene/mine-v2/surface-campus.js js/scene/mine-v2/terrain.js js/scene/mine-v2/topology.mjs js/scene/mine-v2/mine-v2.js tests/mine-v2-config.test.mjs
git commit -m "feat: add mine v2 surface campus"
```

---

### Task 6: 1206 Working Face and Runtime Adaptation

**Files:**
- Create: `js/scene/mine-v2/working-face.js`
- Create: `js/scene/mine-v2/scene-adapter.js`
- Modify: `js/scene/mine-v2/mine-v2.js`
- Modify: `js/scene.js:855-1230`
- Modify: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: `buildWorkingFace(materials, runtime)` and `createSceneAdapter(runtime)` with stable role lookup `runtime.objectsByRole`.
- Consumes: third-horizon gate endpoints and the existing disaster method names.

- [ ] **Step 1: Add failing role coverage tests**

```js
test('working-face role contract includes every disaster dependency', () => {
  assert.deepEqual(MINE_V2_CONFIG.requiredRoles, [
    'workingFace', 'coalWall', 'hydraulicSupportArray', 'shearer',
    'scraperConveyor', 'stageLoader', 'pumpRoom', 'centralSubstation',
  ]);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/mine-v2-config.test.mjs`

Expected: FAIL because `requiredRoles` is undefined.

- [ ] **Step 3: Build the 140m face volume and equipment anchors**

Create the coal wall, roof envelope, floor, two gate connections, support array anchor, shearer path, scraper path, stage-loader anchor, and goaf boundary. Reuse current equipment geometry only as a scale reference until the later fine-model task.

- [ ] **Step 4: Adapt disaster lookup without hard-coded coordinates**

Implement `createSceneAdapter(runtime)` in `scene-adapter.js`. Add `runtime.objectsByRole = new Map()` and register every role. In existing disaster methods, resolve Mine V2 targets through the adapter; retain current coordinate behavior when the adapter is absent. Do not change public method names such as `explosion()`, `roofCollapse()`, `waterInrush()`, `fire()`, or `reset()`.

- [ ] **Step 5: Run tests and repeat disaster/reset smoke tests**

Run: `node --test tests/mine-v2-config.test.mjs`

In `/?scene=v2`, trigger each available disaster and reset twice. Expected: no exception, local effect near the mapped role, and full transform/material restoration.

- [ ] **Step 6: Commit Task 6 files**

```powershell
git add -- js/scene/mine-v2/working-face.js js/scene/mine-v2/scene-adapter.js js/scene/mine-v2/mine-v2.js js/scene.js js/scene/mine-v2/config.mjs tests/mine-v2-config.test.mjs
git commit -m "feat: connect mine v2 working face runtime"
```

---

### Task 7: Topology-Derived Monitoring, Simulator, Labels, and Cameras

**Files:**
- Create: `js/scene/mine-v2/simulator.mjs`
- Create: `js/scene/mine-v2/monitor-layout.mjs`
- Create: `js/scene/mine-v2/labels.js`
- Modify: `js/scene/mine-v2/topology.mjs`
- Modify: `js/scene/mine-v2/mine-v2.js`
- Modify: `js/scene.js:810-853`
- Modify: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: `createMineV2Simulator(seed)`, `buildMonitorAnchors()`, label tiers, and four camera presets.
- Consumes: topology sampling, metric definitions, and the runtime registry.

- [ ] **Step 1: Add failing monitor classification and determinism tests**

```js
import { buildMonitorAnchors } from '../js/scene/mine-v2/monitor-layout.mjs';
import { createMineV2Simulator } from '../js/scene/mine-v2/simulator.mjs';

test('roof-sensor count excludes people and cameras', () => {
  const anchors = buildMonitorAnchors();
  const sensors = anchors.filter(item => item.category === 'roof-sensor');
  assert.ok(sensors.length >= 12);
  assert.ok(sensors.every(item => !['camera', 'person'].includes(item.type)));
});

test('same seed produces the same initial state and smooth updates', () => {
  const a = createMineV2Simulator(20260728);
  const b = createMineV2Simulator(20260728);
  assert.deepEqual(a.snapshot(), b.snapshot());
  const before = a.snapshot().metrics.roofPressure;
  const after = a.update(0.5).metrics.roofPressure;
  assert.ok(Math.abs(after - before) < 2);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/mine-v2-config.test.mjs`

Expected: FAIL for missing simulator export or monitor anchors.

- [ ] **Step 3: Generate anchors from roadway mileages and roles**

Place roof sensors at the face, both gates, return side, deep roadway sections, intersections, and chambers. Store cameras, people, and equipment status in separate categories. Every anchor must contain `id`, `category`, `type`, `edgeId` or `nodeId`, `position`, `unit`, `warn`, and `danger`.

- [ ] **Step 4: Implement a seeded continuous simulator**

Use elapsed time, two sine bands, bounded drift, and a deterministic seeded noise function. Return one state object containing metrics, equipment registry, monitor registry, history, risk score, and the exact note `比赛演示模拟数据，非生产安全标准`.

- [ ] **Step 5: Build CSS2D labels and monitor markers**

Show no more than 10 operational labels in overview. Expand sensor and equipment labels in underground and working-face views. Derive label text, color, and value from the same simulator snapshot used by UI adapters.

- [ ] **Step 6: Add four camera presets and per-mode limits**

Use `CAMERA_PRESETS` and `CONTROL_LIMITS` from Task 2. `workingFace` must focus the face without hiding its enclosing roof and gate connections. Add `switchToWorkingFace()` while keeping the three existing exported switch functions.

- [ ] **Step 7: Run tests and data-consistency checks**

Run: `node --test tests/mine-v2-config.test.mjs`

In the browser, compare `window.__mineDiagnostics` counts with visible UI values. Expected: scene object, equipment, roof sensor, camera, and person counts match their separate registries.

- [ ] **Step 8: Commit Task 7 files**

```powershell
git add -- js/scene/mine-v2/simulator.mjs js/scene/mine-v2/monitor-layout.mjs js/scene/mine-v2/labels.js js/scene/mine-v2/topology.mjs js/scene/mine-v2/mine-v2.js js/scene.js tests/mine-v2-config.test.mjs
git commit -m "feat: add mine v2 monitoring and views"
```

---

### Task 8: Browser Visual QA, Performance Gate, and Handoff Report

**Files:**
- Create: `docs/qa/mine-v2-validation.md`
- Modify: Mine V2 files only when a recorded validation defect requires a fix.

**Interfaces:**
- Consumes: `window.__mineDiagnostics`, camera presets, simulator registries, and renderer statistics.
- Produces: an evidence-backed validation report and a decision on whether Mine V2 may replace the default scene.

- [ ] **Step 1: Run the complete unit suite**

Run: `node --test tests/mine-v2-config.test.mjs`

Expected: all tests PASS with no skipped tests.

- [ ] **Step 2: Capture required viewport evidence**

Using the in-app browser, capture `/?scene=v2` at `1920x1080`, `1536x1024`, and a narrow mobile viewport. Record screenshots for overview, surface, underground, and working-face presets.

- [ ] **Step 3: Run canvas and layout checks**

Measure non-background canvas pixels, page scroll overflow, overlapping UI bounds, visible object count, and label count. Fail validation if the canvas is blank, labels overlap core equipment, or page text is clipped.

- [ ] **Step 4: Run spatial behavior checks**

Inspect the approved front camera and two allowed orbit angles. Verify continuous rock enclosure, real tunnel depth, true junctions, grounded roads/vehicles, connected portal/incline, and no facade/platform/cavern regression.

- [ ] **Step 5: Record performance and asset failures**

Run the scene for at least 30 seconds at `1920x1080`. Record average FPS, renderer triangle count, texture count, first-ready time, and console resource errors. Fail the performance gate below 40 average FPS.

- [ ] **Step 6: Write the validation report with measured evidence**

Create `docs/qa/mine-v2-validation.md` with sections named `Build`, `Visual Composition`, `Spatial Integrity`, `Data Integrity`, `Performance`, and `Decision`. Under `Build`, paste the output of `git rev-parse HEAD` and the tested URL. Under the three viewport entries, record `PASS` or `FAIL` followed by the screenshot filename and the observed defect or acceptance reason. Under `Data Integrity`, paste the serialized registry counts from `window.__mineDiagnostics`. Under `Performance`, paste the measured first-ready milliseconds, 30-second average FPS, renderer triangle count, texture count, and console error count. Set `Decision` to exactly `Keep query-only preview` unless every preceding entry is `PASS`; only then set it to `Eligible for separate default-switch approval`.

- [ ] **Step 7: Commit QA evidence and any scoped fixes**

```powershell
git add -- docs/qa/mine-v2-validation.md js/scene/mine-v2 tests/mine-v2-config.test.mjs js/scene.js
git commit -m "test: validate mine v2 cutaway scene"
```

- [ ] **Step 8: Preserve the default scene unless every gate passes**

If any visual, data, or performance gate fails, leave `/` on the legacy scene and continue using `/?scene=v2` for fixes. Only a separate approved change may make Mine V2 the default.
