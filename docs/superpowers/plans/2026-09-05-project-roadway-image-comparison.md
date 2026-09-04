# Project Roadway Image Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a real Three.js roadway screenshot annotation, a topology-accurate plan view, and a side-by-side comparison using the same eight project-defined monitoring points.

**Architecture:** A Node exporter imports the live scene modules and serializes the approved roadway and monitor data to JSON. A Playwright capture script authenticates against the local server, isolates the real Three.js canvas, and saves the source render. A Python renderer consumes the exported JSON and captured render to build SVG/PNG deliverables with vector annotations and deterministic dimensions.

**Tech Stack:** Node.js ES modules, Playwright, Three.js runtime, Python 3.10, Pillow, SVG.

## Global Constraints

- Use the existing `focused-longwall.js` scene as the only source for the 3D roadway image.
- Use `topology.mjs` roadway nodes and edges as the only source for the plan-view connectivity.
- Show exactly eight approved monitoring points with matching numbering in both versions.
- Keep equipment green, sensors orange, CCTV blue, and the risk area red.
- Label every image with `依据项目 Three.js 场景生成，非施工图`.
- Independent images are exactly 1600 x 1000; comparison output is exactly 2000 x 700.
- Do not modify runtime authentication or production scene behavior for image generation.

---

### Task 1: Figure Data Contract

**Files:**
- Modify: `js/scene/mine-v2/focused-longwall.js`
- Create: `tools/export-project-roadway-layout.mjs`
- Create: `tests/project-roadway-figures.test.mjs`

**Interfaces:**
- Consumes: `ROADWAY_NODES`, `ROADWAY_EDGES`, and the eight monitor literals in `focused-longwall.js`.
- Produces: `tools/.generated/project-roadway-layout.json` with `{ nodes, edges, monitors, equipment, source }`.

- [ ] **Step 1: Write the failing contract test**

```js
test('project roadway figure data uses the approved eight live-scene monitors', () => {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  assert.equal(data.monitors.length, 8);
  assert.deepEqual(data.monitors.map(item => item.id), [
    'roof-separation-01', 'roof-separation-02', 'roof-separation-03',
    'convergence-01', 'anchor-load-01', 'support-pressure-03',
    'microseismic-01', 'cctv-01',
  ]);
  assert.equal(data.edges.length, ROADWAY_EDGES.length);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/project-roadway-figures.test.mjs`

Expected: FAIL because the exporter and JSON artifact do not exist.

- [ ] **Step 3: Implement the exporter**

Move the existing eight monitor objects to an exported frozen `FOCUSED_LONGWALL_MONITORS` constant in `focused-longwall.js`, then have the runtime iterate that constant without changing object fields or scene behavior. Import the topology arrays and monitor constant directly, validate the exact eight IDs, and write JSON. Include the source module paths in `source` so generated figures can state their provenance.

- [ ] **Step 4: Generate data and pass the contract test**

Run: `node tools/export-project-roadway-layout.mjs`

Run: `node --test tests/project-roadway-figures.test.mjs`

Expected: PASS with 10 nodes, 13 edges, and exactly 8 local monitors.

- [ ] **Step 5: Commit the data contract**

```bash
git add js/scene/mine-v2/focused-longwall.js tools/export-project-roadway-layout.mjs tests/project-roadway-figures.test.mjs
git commit -m "test: define project roadway figure data"
```

### Task 2: Real Three.js Scene Capture

**Files:**
- Create: `tools/capture-project-roadway.cjs`
- Create: `tools/.generated/project-roadway-source.png`
- Modify: `tests/project-roadway-figures.test.mjs`

**Interfaces:**
- Consumes: local authenticated dashboard at `/?scene=v2&view=underground&field=risk&portal=enterprise`.
- Produces: a 1600 x 1000 PNG capture of the real Three.js roadway without dashboard side panels.

- [ ] **Step 1: Add a failing source-capture assertion**

```js
test('real roadway source capture has the required dimensions', () => {
  const bytes = fs.readFileSync(SOURCE_PNG);
  assert.equal(bytes.readUInt32BE(16), 1600);
  assert.equal(bytes.readUInt32BE(20), 1000);
  assert.ok(bytes.length > 200_000);
});
```

- [ ] **Step 2: Verify the assertion fails before capture**

Run: `node --test tests/project-roadway-figures.test.mjs`

Expected: FAIL because `project-roadway-source.png` is absent.

- [ ] **Step 3: Implement deterministic Playwright capture**

The script starts from a caller-provided base URL, posts `enterprise_operator` credentials to `/api/auth/login`, sets the returned session cookie, opens the underground view, waits for `window.__mineCameraState`, injects capture-only CSS that expands `#threeContainer` to 1600 x 1000 and hides panels, dispatches `resize`, waits for textures and animation to settle, and screenshots the center container.

- [ ] **Step 4: Capture and verify**

Run: `node tools/capture-project-roadway.cjs tools/.generated/project-roadway-source.png http://localhost:<port>/`

Run: `node --test tests/project-roadway-figures.test.mjs`

Expected: PASS and the image visibly contains the real arched roadway, supports, equipment, and working-face exit.

- [ ] **Step 5: Commit the reusable capture script and test**

```bash
git add tools/capture-project-roadway.cjs tests/project-roadway-figures.test.mjs
git commit -m "feat: capture real Three.js roadway scene"
```

Do not commit `tools/.generated/project-roadway-source.png`; it is an intermediate render.

### Task 3: Annotated and Topology Figure Renderer

**Files:**
- Create: `tools/generate-project-roadway-figures.py`
- Create: `competition_submission/figures/project-roadway-3d-annotated.png`
- Create: `competition_submission/figures/project-roadway-3d-annotated.svg`
- Create: `competition_submission/figures/project-roadway-topology.png`
- Create: `competition_submission/figures/project-roadway-topology.svg`
- Create: `competition_submission/figures/project-roadway-comparison.png`
- Modify: `tests/project-roadway-figures.test.mjs`

**Interfaces:**
- Consumes: `project-roadway-layout.json` and `project-roadway-source.png`.
- Produces: five final figure files at the exact paths and dimensions in the specification.

- [ ] **Step 1: Add failing output assertions**

```js
for (const output of INDEPENDENT_OUTPUTS) assertPngOrSvgSize(output, 1600, 1000);
assertPngSize(COMPARISON_PNG, 2000, 700);
for (const svg of SVG_OUTPUTS) {
  const source = fs.readFileSync(svg, 'utf8');
  assert.equal((source.match(/data-local-monitor=/g) ?? []).length, 8);
  assert.match(source, /依据项目 Three\.js 场景生成，非施工图/);
}
```

- [ ] **Step 2: Verify missing outputs fail**

Run: `node --test tests/project-roadway-figures.test.mjs`

Expected: FAIL for the five absent final deliverables.

- [ ] **Step 3: Implement the deterministic renderer**

Render version A as the captured scene inside an industrial information frame with eight numbered vector callouts and a right-side legend. Render version B from the topology JSON using an X-Z projection, preserve every node and edge connection, and add a focused 0-20 m inset for the same eight monitor positions. Rasterize both with Pillow at 1600 x 1000 and assemble the 2000 x 700 comparison without resampling text below readable size.

- [ ] **Step 4: Generate and run focused tests**

Run: `python tools/generate-project-roadway-figures.py`

Run: `node --test tests/project-roadway-figures.test.mjs`

Expected: all figure contract tests PASS.

- [ ] **Step 5: Commit final figures and generator**

```bash
git add tools/generate-project-roadway-figures.py tests/project-roadway-figures.test.mjs competition_submission/figures/project-roadway-*
git commit -m "feat: add project roadway comparison figures"
```

### Task 4: Visual QA and Cleanup

**Files:**
- Modify only if QA finds defects: `tools/generate-project-roadway-figures.py`
- Remove: `tools/.generated/project-roadway-layout.json`
- Remove: `tools/.generated/project-roadway-source.png`

**Interfaces:**
- Consumes: all five final figures.
- Produces: visually approved deliverables and a clean repository.

- [ ] **Step 1: Inspect all three PNG outputs at full size**

Verify version A is recognizably the current project scene; version B preserves topology; all eight numbers are visible; labels do not overlap equipment or one another; comparison text remains readable.

- [ ] **Step 2: Run the complete regression suite**

Run: `node --test`

Expected: all existing and new tests PASS.

- [ ] **Step 3: Remove intermediate generation artifacts**

Delete only the two files created under `tools/.generated`; remove that directory if empty. Keep the final PNG/SVG outputs and reusable scripts.

- [ ] **Step 4: Verify repository state and final dimensions**

Run: `git status --short`

Expected: no uncommitted changes after the final QA commit.

- [ ] **Step 5: Commit QA fixes if any**

```bash
git add tools/generate-project-roadway-figures.py competition_submission/figures/project-roadway-*
git commit -m "fix: refine project roadway figure readability"
```
