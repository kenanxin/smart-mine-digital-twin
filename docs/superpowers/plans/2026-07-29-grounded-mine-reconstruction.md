# Grounded Mine Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct Mine V2 as one grounded mine with only Surface and Underground entry points, continuous terrain, physically buried roadways, and a longwall district that belongs to the underground world.

**Architecture:** Preserve the dashboard, simulator, registries, disaster roles, resource pipeline, and legacy default scene. Split Mine V2 into explicit `surfaceRoot` and `undergroundRoot` groups at world origin, let the scene adapter select visibility by mode, and generate all terrain, roadways, equipment, and monitor anchors in one coordinate system. The longwall remains a navigable underground location and equipment target, not a separate user-facing view.

**Tech Stack:** Three.js ES modules, OrbitControls transition layer, pure `.mjs` topology and terrain functions, Node built-in test runner, browser visual validation.

## Global Constraints

- Keep `/` on the legacy scene; Mine V2 remains available only through `/?scene=v2` until every validation gate passes.
- Expose exactly two user-facing entry modes: `surface` and `underground`.
- Keep all 12 equipment registry records and all required disaster-role names.
- Use one meter-scale world coordinate system with terrain near `Y=0` and mine horizons below it.
- Never expose terrain undersides, floating roads, open tunnel shells, black world voids, or underground objects in Surface mode.
- Do not modify `js/scene/integrated-mine.js`.
- Target at least 40 average FPS at `1920x1080` after reconstruction.

---

### Task 1: Two-Mode UI And Layer Contract

**Files:**
- Modify: `js/main.js`
- Modify: `js/scene.js`
- Modify: `js/scene/mine-v2/camera-presets.mjs`
- Modify: `js/scene/mine-v2/mine-v2.js`
- Modify: `js/scene/mine-v2/scene-adapter.js`
- Test: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: `runtime.surfaceRoot`, `runtime.undergroundRoot`, and `runtime.setViewMode(mode)`.
- Produces: `sceneAdapter.setViewMode(mode)` for `surface | underground`.
- Preserves: internal role `workingFace` for disaster effects and equipment targeting.

- [ ] **Step 1: Write the failing two-mode contract test**

```js
test('mine v2 exposes only surface and underground entry modes', () => {
  assert.deepEqual(Object.keys(CAMERA_PRESETS), ['surface', 'underground']);
  assert.deepEqual(Object.keys(CONTROL_LIMITS), ['surface', 'underground']);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test --test-isolation=none tests/mine-v2-config.test.mjs`

Expected: FAIL because `workingFace` remains a preset.

- [ ] **Step 3: Implement the explicit layer contract**

Create world-origin `surfaceRoot` and `undergroundRoot` groups in `buildMineV2`, place terrain and campus in `surfaceRoot`, and place roadways, chambers, working-face equipment, underground monitors, and underground fill lights in `undergroundRoot`. Implement:

```js
runtime.setViewMode = mode => {
  runtime.surfaceRoot.visible = mode === 'surface';
  runtime.undergroundRoot.visible = mode === 'underground';
};
```

Remove the generated Working Face button and public switch function. Keep the `workingFace` object role.

- [ ] **Step 4: Run syntax and contract tests**

Run:

```powershell
node --check js/main.js
node --check js/scene.js
node --check js/scene/mine-v2/mine-v2.js
node --test --test-isolation=none tests/mine-v2-config.test.mjs
```

Expected: all checks pass and the UI exposes only Surface and Underground.

- [ ] **Step 5: Commit**

```powershell
git add -- js/main.js js/scene.js js/scene/mine-v2/camera-presets.mjs js/scene/mine-v2/mine-v2.js js/scene/mine-v2/scene-adapter.js tests/mine-v2-config.test.mjs
git commit -m "refactor: unify mine v2 surface and underground modes"
```

### Task 2: Continuous Ground And Valid Surface Routes

**Files:**
- Modify: `js/scene/mine-v2/terrain.js`
- Modify: `js/scene/mine-v2/terrain-profile.mjs`
- Modify: `js/scene/mine-v2/topology.mjs`
- Modify: `js/scene/mine-v2/surface-campus.js`
- Test: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: `getTerrainHeight(x, z)` for natural ground.
- Produces: `getGradedHeight(x, z)` for the industrial pad.
- Produces: `resolveSurfaceRoute(route)` returning terrain-anchored `[x,y,z]` points.

- [ ] **Step 1: Add failing terrain-continuity and route-purpose tests**

Assert that terrain has no cutaway opening, both surface routes declare endpoints, and every resolved route point equals `getGradedHeight(x,z) + offset`.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test --test-isolation=none tests/mine-v2-config.test.mjs`

Expected: FAIL because the current terrain removes a large cutaway and surface loops have no business endpoints.

- [ ] **Step 3: Replace cutaway terrain with continuous terrain**

Remove `carveCutawayOpening`. Generate one indexed terrain mesh with vertex colors, a graded campus pad, and perimeter skirts that descend below the lowest reachable camera height. Keep the root at world origin.

- [ ] **Step 4: Replace floating loops with endpoint-driven roads**

Define only routes that connect named destinations such as `campus-entry`, `portal-yard`, `washery`, and `silo-yard`. Resolve every path sample from the terrain function and add road shoulders rather than floating closed ribbons.

- [ ] **Step 5: Run tests and browser-check Surface mode**

Expected: no underground mesh, cutaway hole, floating band, terrain underside, or unconnected road is visible.

- [ ] **Step 6: Commit**

```powershell
git add -- js/scene/mine-v2/terrain.js js/scene/mine-v2/terrain-profile.mjs js/scene/mine-v2/topology.mjs js/scene/mine-v2/surface-campus.js tests/mine-v2-config.test.mjs
git commit -m "feat: ground mine v2 surface terrain and routes"
```

### Task 3: Buried Roadway District

**Files:**
- Modify: `js/scene/mine-v2/topology.mjs`
- Modify: `js/scene/mine-v2/roadway-network.js`
- Modify: `js/scene/mine-v2/camera-presets.mjs`
- Test: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Consumes: meter-scale `ROADWAY_NODES` and `ROADWAY_EDGES`.
- Produces: sealed roadway interiors, junction transitions, utility placements, and navigation curves.

- [ ] **Step 1: Add failing burial and engineering-dimension tests**

Assert that only `portal` lies at terrain height, every non-portal roadway sample remains below the terrain clearance threshold, roadway widths remain in the `4.5m` to `6m` range, and the working-face district is reachable from the portal.

- [ ] **Step 2: Verify the tests fail**

Expected: FAIL because current widths are multiplied by `1.55` and several generated shells expose their exterior.

- [ ] **Step 3: Generate sealed horse-shoe interiors**

Replace the cylinder roof and box-wall assembly with a continuous inner-surface mesh for floor, walls, and arch. Join bends and junctions with overlapping rock mass and closed transition sections. Remove guide-light strips and oversized point lights.

- [ ] **Step 4: Add credible roadway services**

Add sparse roof bolts and mesh, localized steel ribs, one drainage side, one utility-pipe side, cable trays, and emissive fixtures with only a few non-shadowed local lights.

- [ ] **Step 5: Run tests and browser-check Underground mode**

Expected: the camera starts inside the roadway, sees no black world void or external shell, and can understand the route toward the mining district.

- [ ] **Step 6: Commit**

```powershell
git add -- js/scene/mine-v2/topology.mjs js/scene/mine-v2/roadway-network.js js/scene/mine-v2/camera-presets.mjs tests/mine-v2-config.test.mjs
git commit -m "feat: rebuild mine v2 roadway district"
```

### Task 4: Integrated Longwall And Fixed Equipment Locations

**Files:**
- Modify: `js/scene/mine-v2/config.mjs`
- Modify: `js/scene/mine-v2/working-face.js`
- Modify: `js/scene/mine-v2/simulator.mjs`
- Modify: `js/scene/mine-v2/monitor-layout.mjs`
- Test: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: one 70m to 80m longwall location inside `undergroundRoot`.
- Preserves: `workingFace`, `coalWall`, `hydraulicSupportArray`, `shearer`, `scraperConveyor`, and `stageLoader` roles.
- Produces: fixed equipment coordinates for every registry item.

- [ ] **Step 1: Add failing longwall-order and equipment-location tests**

Assert the cross-section order `goaf -> supports -> AFC/shearer -> coal wall`, the face length is between 70m and 80m, every equipment record has one fixed area and position, and all 12 equipment IDs remain unique.

- [ ] **Step 2: Verify the tests fail**

Expected: FAIL because the existing face is 140m and equipment records do not all expose fixed world positions.

- [ ] **Step 3: Rebuild the longwall in the underground coordinate system**

Place about 40 repeated supports at realistic spacing, mount the shearer on the AFC, connect the stage loader and crusher path to the intake gate, enclose the goaf with collapsed rock, and join both gate roads without creating a separate platform.

- [ ] **Step 4: Anchor monitors and equipment to physical objects**

Place roof sensors on roof/support objects, ventilation sensors in the return gate, and equipment state anchors on the corresponding mesh. Remove standalone glowing spheres.

- [ ] **Step 5: Run tests and browser-check the continuous underground route**

Expected: the work face is reached within Underground mode and the UI still reports 12 registered equipment sets with matching status totals.

- [ ] **Step 6: Commit**

```powershell
git add -- js/scene/mine-v2/config.mjs js/scene/mine-v2/working-face.js js/scene/mine-v2/simulator.mjs js/scene/mine-v2/monitor-layout.mjs tests/mine-v2-config.test.mjs
git commit -m "feat: integrate longwall into mine v2 underground"
```

### Task 5: Navigation, Vehicles, Labels, And Validation

**Files:**
- Modify: `js/scene.js`
- Modify: `js/main.js`
- Modify: `js/scene/mine-v2/roadway-network.js`
- Modify: `js/scene/mine-v2/labels.js`
- Modify: `docs/qa/mine-v2-validation.md`
- Test: `tests/mine-v2-config.test.mjs`

**Interfaces:**
- Produces: full underground yaw, bounded roadway movement, equipment focus navigation, distance/occlusion label filtering, and path-distance wheel rotation.

- [ ] **Step 1: Add failing navigation and vehicle-motion tests for pure path helpers**

Assert that yaw is not limited to a 60-degree window, vehicle speed stays within the approved slow range, and wheel angle equals traveled distance divided by wheel radius.

- [ ] **Step 2: Implement roadway-constrained navigation**

Keep the camera near navigation curves with a 1.7m eye height and cross-section clearance. Allow full yaw and forward/back movement while rejecting positions outside the active roadway or junction volume.

- [ ] **Step 3: Implement slow physically coherent vehicles**

Move the rubber-tire vehicle only on the auxiliary route and the locomotive only on rails. Orient bodies from path tangents and rotate wheels around their axle from traveled distance.

- [ ] **Step 4: Implement nearby, occlusion-aware labels**

Show only selected or nearby anchors, hide surface labels underground and underground labels on the surface, and reject labels blocked by mine geometry.

- [ ] **Step 5: Run full automated and browser validation**

Run syntax checks and the complete Node suite. Validate Surface and Underground at `1920x1080`, record first-ready time, 30-second average FPS, geometry, mesh, triangle, and texture counts, and record all remaining visual defects honestly.

- [ ] **Step 6: Update QA decision and commit**

Keep the decision `Keep query-only preview` unless every visual, spatial, data, and performance gate passes.

```powershell
git add -- js/main.js js/scene.js js/scene/mine-v2/roadway-network.js js/scene/mine-v2/labels.js tests/mine-v2-config.test.mjs docs/qa/mine-v2-validation.md
git commit -m "feat: add grounded mine navigation and validation"
```
