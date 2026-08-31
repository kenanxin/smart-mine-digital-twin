# Focused Longwall Roadway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broad mine-atlas scene with a focused underground longwall face exit and 50 m transport roadway that supports camera tracking and roof-disaster monitoring.

**Architecture:** Keep the existing `mine-v2` module boundary, but make the scene builder generate one focused procedural mine segment. Reuse existing Three.js materials, label helpers, and working-face patterns while adding a simple focus registry for left-list click navigation.

**Tech Stack:** Three.js modules, existing V2 scene adapter, OrbitControls, local procedural geometry, browser screenshot QA.

## Global Constraints

- Build one 18-20 m working-face exit segment plus one 50 m transport roadway.
- Do not build a full roadway network, second roadway, locomotive, rail system, surface campus, pump room, or substation.
- Working face order is `goaf -> hydraulic supports -> AFC + shearer -> coal wall`.
- Transport order is `AFC -> stage loader -> crusher -> belt conveyor`.
- Monitoring instruments must attach to real roof, wall, support, bolt, or equipment positions.
- Left equipment list must fly the camera to selected machines and instruments.
- Scene must support 360 degree rotate, pan, and zoom.
- Scene must remain visible when external models or textures fail.

---

### Task 1: Focused Scene Configuration

**Files:**
- Modify: `js/scene/mine-v2/config.mjs`

**Interfaces:**
- Produces: `FOCUSED_LONGWALL_LAYOUT` object with dimensions, zones, camera, and equipment ids.

- [ ] **Step 1: Add layout constants**

Add an exported object:

```js
export const FOCUSED_LONGWALL_LAYOUT = {
  roadway: { length: 50, width: 5.2, height: 3.8 },
  face: { length: 20, miningHeight: 4, supportCount: 12 },
  zones: {
    stageLoader: [0, 12],
    crusher: [8, 16],
    belt: [12, 50],
    monitoring: [0, 20],
  },
  defaultCamera: {
    position: [11, 8, 14],
    target: [1.5, 1.7, 8],
  },
};
```

- [ ] **Step 2: Run existing config tests**

Run: `npm test -- tests/mine-v2-config.test.mjs`

Expected: existing tests still pass or report only pre-existing unrelated failures.

### Task 2: Procedural Mine Geometry

**Files:**
- Modify: `js/scene/mine-v2/roadway-network.js`
- Modify: `js/scene/mine-v2/working-face.js`

**Interfaces:**
- Consumes: `FOCUSED_LONGWALL_LAYOUT`.
- Produces: visible roadway shell, coal wall, goaf, supports, AFC, shearer, stage loader, crusher, belt conveyor.

- [ ] **Step 1: Replace broad roadway generation**

Build one 50 m arched rectangular roadway with dark coal-rock side walls, roof, floor, steel ribs, roof bolts, straps, mesh, lamps, cables, pipes, drainage, coal debris, and puddles.

- [ ] **Step 2: Keep face equipment order correct**

Place the working-face segment perpendicular to the roadway with this order:

```text
goaf -> hydraulic supports -> AFC + shearer -> coal wall
```

- [ ] **Step 3: Add transfer equipment**

Place stage loader from 0-12 m, crusher from 8-16 m, and belt conveyor from 12-50 m.

- [ ] **Step 4: Verify by browser**

Open the app and confirm the first view shows both the face exit and roadway depth.

### Task 3: Monitoring Instruments And Physical Positions

**Files:**
- Modify: `js/scene/mine-v2/monitor-layout.mjs`
- Modify: `js/scene/mine-v2/labels.js`

**Interfaces:**
- Produces: monitoring objects with ids, names, meter marks, values, status, and world positions.

- [ ] **Step 1: Define monitor registry**

Create instrument entries:

```js
{
  id: 'roof-separation-03',
  name: '顶板离层仪 03',
  category: 'monitor',
  meter: 16,
  install: '运输顺槽 16m 顶板中线',
  status: 'warning',
  value: '离层量 38 mm',
  position: [0, 3.65, 16],
}
```

- [ ] **Step 2: Attach monitors to geometry**

Use small industrial boxes, rods, measuring lines, and bolt color indicators attached to roof, side walls, supports, and bolts.

- [ ] **Step 3: Add warning visual states**

Use yellow/red material changes, roof crack highlights, and subtle roof hazard overlays in the 0-20 m zone.

### Task 4: Left-List Tracking

**Files:**
- Modify: `js/scene/mine-v2/equipment-focus-map.mjs`
- Modify: `js/scene/mine-v2/scene-adapter.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: equipment and monitor registry entries.
- Produces: `focusEquipment(id)` behavior that flies the camera, highlights the object, and updates the panel.

- [ ] **Step 1: Map selectable ids**

Include hydraulic supports, shearer, AFC, stage loader, crusher, belt conveyor, and every monitor.

- [ ] **Step 2: Implement camera focus**

Animate camera position toward the target and set OrbitControls target to the equipment center.

- [ ] **Step 3: Implement highlight**

Apply a temporary emissive material pulse or outline helper to the selected object.

- [ ] **Step 4: Wire left panel clicks**

When the user clicks a left-side machine name, call `focusEquipment(id)`.

### Task 5: Navigation And QA

**Files:**
- Modify: `js/scene/mine-v2/camera-presets.mjs`
- Modify: `js/scene/mine-v2/mine-v2.js`

**Interfaces:**
- Produces: default exit view, return-to-exit behavior, 360 degree rotate/pan/zoom.

- [ ] **Step 1: Set default camera**

Use `FOCUSED_LONGWALL_LAYOUT.defaultCamera` for the opening view.

- [ ] **Step 2: Ensure OrbitControls remains unlocked**

Allow free rotate, zoom, and pan around the mine scene.

- [ ] **Step 3: Browser verify**

Use screenshot QA to confirm canvas is nonblank, core equipment is visible, selected devices are not floating, and left-list tracking works.

### Task 6: Documentation Closeout

**Files:**
- Modify: `docs/superpowers/plans/2026-07-30-focused-longwall-roadway.md`

**Interfaces:**
- Produces: checked-off implementation status and test notes.

- [ ] **Step 1: Record verification**

Add the browser URL, commands run, and visible QA result.

Verification recorded on 2026-07-30:

- Local URL: `http://localhost:8080/?scene=v2&view=underground`
- Syntax checks: `node --check` passed for `js/scene.js`, `js/main.js`, `js/mine-data.js`, `js/scene/materials.js`, `js/scene/mine-v2/config.mjs`, `js/scene/mine-v2/mine-v2.js`, and `js/scene/mine-v2/focused-longwall.js`.
- Visual QA screenshot: `.superpowers/focused-longwall-qa-final.png`.
- Canvas pixel check: 570/575 sampled center pixels differed from the prior flat loading background, ratio `0.991`.
- Visible result: underground roadway, roof/sidewall support, conveyor/transfer equipment, hydraulic support canopy area, warning roof zone, and physical monitor labels are visible in the default view.
- Left-list tracking code path: equipment rows call `focusMineEquipment(id)`, which now resolves the role object, flies the camera to the object, highlights it, and writes position/status/value text to the right monitoring note area for six seconds.

- [ ] **Step 2: Commit scoped files**

Stage only files touched for this focused scene and commit with:

```bash
git commit -m "feat: build focused longwall roadway scene"
```
