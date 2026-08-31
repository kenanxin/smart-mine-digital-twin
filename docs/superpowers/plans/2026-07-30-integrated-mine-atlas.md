# Integrated Mine Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Mine V2 from a visible roadway graph into one integrated, grounded mine atlas where only roadway interiors are enterable and all other underground zones are focused within the atlas.

**Architecture:** Keep the current V2 module boundary and legacy scene untouched. Add atlas-level zone metadata, hide graph-like roadway exteriors in rock/coal strata, expose only selected cutaway interiors, and route equipment/list clicks through a focus adapter.

**Tech Stack:** Three.js ES modules, OrbitControls, existing GLB assets, existing simulator/dashboard data, Node built-in test runner, local browser QA.

## Global Constraints

- Do not modify `js/scene/integrated-mine.js`.
- Keep legacy `/` visually unchanged.
- V2 exposes only Surface and Underground as top-level buttons.
- Underground default is `atlas`, not a single tunnel and not a graph view.
- Only `mainHaulage`, `auxTransport`, and `returnAirway` are true internal roadway entries.
- `pumpRoom`, `substation`, and `longwall` are atlas focus targets only.
- Every equipment list entry must focus a visible object or visible zone.
- No floating mine, black void, exposed tube exterior, buried vehicle, asphalt-like open-pit road, or neon/sci-fi guide track.
- Keep expected desktop performance at 40 FPS or better.

---

### Task 1: Zone Metadata And Navigation Contract

**Files:**
- Create: `js/scene/mine-v2/zone-presets.mjs`
- Modify: `js/scene/mine-v2/camera-presets.mjs`
- Modify: `js/scene/mine-v2/scene-adapter.js`
- Modify: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: `ZONE_PRESETS`, keyed by `atlas`, `mainHaulage`, `auxTransport`, `returnAirway`, `pumpRoom`, `substation`, `longwall`.
- Produces: `ROADWAY_ENTRY_ZONE_IDS = ['mainHaulage', 'auxTransport', 'returnAirway']`.
- Produces: `FOCUS_ONLY_ZONE_IDS = ['pumpRoom', 'substation', 'longwall']`.
- Produces: `sceneAdapter.getZonePreset(id)` and `sceneAdapter.focusZone(id)`.

- [ ] **Step 1: Add contract tests**

```js
import { ZONE_PRESETS, ROADWAY_ENTRY_ZONE_IDS, FOCUS_ONLY_ZONE_IDS } from '../js/scene/mine-v2/zone-presets.mjs';

test('mine atlas has exactly three enterable roadway zones', () => {
  assert.deepEqual(ROADWAY_ENTRY_ZONE_IDS, ['mainHaulage', 'auxTransport', 'returnAirway']);
  assert.deepEqual(FOCUS_ONLY_ZONE_IDS, ['pumpRoom', 'substation', 'longwall']);
  assert.deepEqual(Object.keys(ZONE_PRESETS), ['atlas', 'mainHaulage', 'auxTransport', 'returnAirway', 'pumpRoom', 'substation', 'longwall']);
  for (const id of ROADWAY_ENTRY_ZONE_IDS) assert.equal(ZONE_PRESETS[id].mode, 'roadway');
  for (const id of FOCUS_ONLY_ZONE_IDS) assert.equal(ZONE_PRESETS[id].mode, 'focus');
});
```

- [ ] **Step 2: Run failing test**

Run: `node --test --test-isolation=none tests/mine-v2-config.test.mjs`

Expected: FAIL because `zone-presets.mjs` does not exist.

- [ ] **Step 3: Implement zone metadata**

Create `zone-presets.mjs` with fixed camera `position`, `target`, `fov`, `mode`, and `label` for every zone. Update `CAMERA_PRESETS.underground` to reuse `ZONE_PRESETS.atlas`.

- [ ] **Step 4: Add adapter methods**

In `scene-adapter.js`, add:

```js
getZonePreset(id) {
  return runtime.zonePresets?.[id] ?? null;
},
focusZone(id) {
  const preset = runtime.zonePresets?.[id];
  if (!preset) return null;
  runtime.requestCameraFocus?.(preset);
  return preset;
}
```

- [ ] **Step 5: Run tests**

Run: `node --test --test-isolation=none tests/mine-v2-config.test.mjs`

Expected: PASS for the new zone contract.

### Task 2: Atlas Geology Mass

**Files:**
- Create: `js/scene/mine-v2/mine-atlas.mjs`
- Modify: `js/scene/mine-v2/mine-v2.js`
- Modify: `js/scene/mine-v2/materials.js`
- Test: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: `buildMineAtlas(materials, runtime)` returning a `THREE.Group` named `mineV2IntegratedAtlas`.
- Produces: role objects `atlasGeologyMass`, `coalSeamCutaway`, `mainAtlasWindow`.

- [ ] **Step 1: Add test for atlas roles**

```js
test('mine atlas contract exposes geology and cutaway roles', () => {
  assert.ok(MINE_V2_CONFIG.requiredRoles.includes('atlasGeologyMass'));
  assert.ok(MINE_V2_CONFIG.requiredRoles.includes('coalSeamCutaway'));
  assert.ok(MINE_V2_CONFIG.requiredRoles.includes('mainAtlasWindow'));
});
```

- [ ] **Step 2: Run failing test**

Run: `node --test --test-isolation=none tests/mine-v2-config.test.mjs`

Expected: FAIL because required roles do not include atlas roles.

- [ ] **Step 3: Build atlas mass**

Create a large back/side rock mass with layered boxes and roughened faces:

```js
const layers = [
  { name: 'topsoil', y: -12, height: 22, color: 0x6b5847 },
  { name: 'sandstone', y: -52, height: 58, color: 0x8a7b67 },
  { name: 'coal', y: -124, height: 18, color: 0x111111 },
  { name: 'floorRock', y: -164, height: 48, color: 0x5e554b },
];
```

Use the existing rock and coal materials, clone them per layer, and place the mass behind the exposed roadways so underground reads as embedded.

- [ ] **Step 4: Register atlas roles**

In `mine-v2.js`, call `buildMineAtlas()` before `buildRoadwayNetwork()` so roadways appear inside the mass. Register atlas roles in `runtime.objectsByRole`.

- [ ] **Step 5: Run syntax/tests**

Run:

```powershell
node --check js/scene/mine-v2/mine-atlas.mjs
node --check js/scene/mine-v2/mine-v2.js
node --test --test-isolation=none tests/mine-v2-config.test.mjs
```

Expected: PASS.

### Task 3: Convert Roadway Graph Into Embedded Atlas Interiors

**Files:**
- Modify: `js/scene/mine-v2/topology.mjs`
- Modify: `js/scene/mine-v2/roadway-network.js`
- Modify: `js/scene/mine-v2/labels.js`
- Test: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Preserves: `sampleEdge(edgeId, t)` and `getConnectedNodeIds(nodeId)`.
- Produces: `ATLAS_EXPOSED_EDGE_IDS = ['main-incline-h1', 'main-level-h2', 'return-airway', 'intake-gate-road']`.
- Produces: visual roadways with interiors, partial cutaway openings, and no exposed exterior tube look.

- [ ] **Step 1: Add exposed-edge test**

```js
import { ATLAS_EXPOSED_EDGE_IDS } from '../js/scene/mine-v2/topology.mjs';

test('atlas exposes only selected roadway sections', () => {
  assert.deepEqual(ATLAS_EXPOSED_EDGE_IDS, ['main-incline-h1', 'main-level-h2', 'return-airway', 'intake-gate-road']);
  for (const id of ATLAS_EXPOSED_EDGE_IDS) assert.ok(ROADWAY_EDGES.some(edge => edge.id === id));
});
```

- [ ] **Step 2: Run failing test**

Run: `node --test --test-isolation=none tests/mine-v2-config.test.mjs`

Expected: FAIL because `ATLAS_EXPOSED_EDGE_IDS` does not exist.

- [ ] **Step 3: Reduce graph-like visual exposure**

Keep the topology data, but in `buildRoadwayNetwork()` set non-exposed roadways to simplified shadowed embedded connectors, and build only exposed sections with full supports, floor, pipes, rails, drainage, lamps, and partial roofs.

- [ ] **Step 4: Remove sci-fi visual cues**

Remove neon-like guide strips and oversized glowing paths. Keep warm practical lamps and small monitor markers.

- [ ] **Step 5: Run tests**

Run: `node --test --test-isolation=none tests/mine-v2-config.test.mjs`

Expected: PASS.

### Task 4: Equipment Zone Mapping And Focus

**Files:**
- Modify: `js/scene/mine-v2/underground-asset-layout.mjs`
- Modify: `js/scene/mine-v2/underground-assets.js`
- Modify: `js/scene/mine-v2/simulator.mjs`
- Modify: `js/main.js`
- Modify: `js/scene.js`
- Test: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: each underground asset placement has `zoneId`.
- Produces: `window.focusMineEquipment(id)` or equivalent event bridge that calls scene focus behavior.
- Preserves: dashboard total equipment count.

- [ ] **Step 1: Add placement mapping test**

```js
test('underground assets map to atlas zones', () => {
  const zoneIds = new Set(Object.keys(ZONE_PRESETS));
  for (const placement of UNDERGROUND_ASSET_DEPLOYMENTS) {
    assert.ok(zoneIds.has(placement.zoneId), `${placement.id} has invalid zoneId`);
  }
});
```

- [ ] **Step 2: Run failing test**

Run: `node --test --test-isolation=none tests/mine-v2-config.test.mjs`

Expected: FAIL because placements do not all have `zoneId`.

- [ ] **Step 3: Add zone IDs and focus roles**

Map assets:

```js
{
  'belt-1206': 'longwall',
  'loco-h2': 'mainHaulage',
  'vent-return': 'returnAirway',
  'pump-skid': 'pumpRoom',
  'substation-skid': 'substation',
  'camera-h2': 'mainHaulage',
  'camera-h3': 'auxTransport',
  'camera-intake': 'longwall',
  'camera-return': 'returnAirway',
}
```

- [ ] **Step 4: Wire list clicks**

In `main.js`, attach click handlers to `.equip-row`. In `scene.js`, expose a focus function that looks up `sceneObjectName`, role, or zone mapping and applies the correct camera preset.

- [ ] **Step 5: Run tests and manual click check**

Expected: every equipment row focuses a visible object or visible zone.

### Task 5: Browser QA And Visual Corrections

**Files:**
- Modify: `docs/qa/mine-v2-validation.md`
- Modify as needed: files changed by Tasks 1-4

**Interfaces:**
- Produces: honest QA notes for the current preview URL and remaining defects.

- [ ] **Step 1: Run automated checks**

Run:

```powershell
node --check js/main.js
node --check js/scene.js
node --test --test-isolation=none tests/mine-v2-config.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Start or reuse local server**

Run: `node server.js 8084`

Expected: preview available at `http://localhost:8084/?scene=v2`.

- [ ] **Step 3: Browser visual QA**

Check:

- Underground starts on atlas view.
- 360-degree atlas orbit works.
- Only roadway entries go inside.
- Pump room, substation, and longwall focus in the atlas, not separate interiors.
- Vehicles are not buried.
- Surface open-pit roads read as dirt roads.
- No floating underground mass or black-void framing.

- [ ] **Step 4: Fix visual issues found in QA**

Apply small focused adjustments to camera positions, object heights, material colors, and labels until the first screen reads as a coherent mine atlas.

- [ ] **Step 5: Update QA doc**

Record URL, date, test commands, FPS/mesh/triangle diagnostics if available, and remaining known issues.
