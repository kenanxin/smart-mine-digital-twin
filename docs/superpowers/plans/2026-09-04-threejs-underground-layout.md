# Three.js Underground Layout Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a teacher-facing underground Three.js layout diagram that accurately shows the roadway topology, equipment chain, and monitoring instruments.

**Architecture:** A single Python generator owns the diagram data and renders both SVG and PNG from the same normalized coordinates. A Node test validates output dimensions, required labels, topology counts, and image integrity without changing the runtime Three.js application.

**Tech Stack:** Python 3, Pillow, SVG 1.1, Node.js test runner

## Global Constraints

- Show only the underground scene.
- Use the approved full-network plus 1206 working-face inset composition.
- Use the approved gray-white industrial infographic style.
- Produce a 1600 x 1000 SVG and PNG.
- Keep equipment and instrument names aligned with the current Three.js source.

---

### Task 1: Define the output contract

**Files:**
- Create: `tests/underground-layout-figure.test.mjs`
- Test: `tests/underground-layout-figure.test.mjs`

**Interfaces:**
- Consumes: generated SVG and PNG files under `competition_submission/figures/`
- Produces: an executable output contract for the generator

- [x] **Step 1: Write the failing test**

```js
test('underground layout figure contains the approved scene content', () => {
  assert.equal(svg.getAttribute('width'), '1600');
  assert.equal(svg.getAttribute('height'), '1000');
  for (const label of REQUIRED_LABELS) assert.match(source, new RegExp(label));
  assert.equal((source.match(/data-roadway-node=/g) ?? []).length, 10);
  assert.equal((source.match(/data-roadway-edge=/g) ?? []).length, 13);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test tests/underground-layout-figure.test.mjs`

Expected: FAIL because the figure files do not exist.

- [x] **Step 3: Commit the failing contract**

```bash
git add tests/underground-layout-figure.test.mjs
git commit -m "test: define underground layout figure contract"
```

### Task 2: Generate the vector and bitmap diagram

**Files:**
- Create: `tools/generate_threejs_underground_layout.py`
- Create: `competition_submission/figures/threejs-underground-layout.svg`
- Create: `competition_submission/figures/threejs-underground-layout.png`
- Test: `tests/underground-layout-figure.test.mjs`

**Interfaces:**
- Consumes: the topology, device, and instrument values mirrored from `topology.mjs`, `monitor-layout.mjs`, and `focused-longwall.js`
- Produces: `render_svg(output_path)` and `render_png(output_path)` with identical labels and color semantics

- [x] **Step 1: Implement normalized layout data**

```python
ROADWAY_NODES = {
    "portal": (260, 18, -45),
    "h1-junction": (160, -45, -60),
    "h2-junction": (90, -95, -85),
    "h3-junction": (20, -155, -110),
    "working-face-1206": (-110, -155, -110),
}

LOCAL_MONITORS = [
    "顶板离层仪 01", "顶板离层仪 02", "顶板离层仪 03",
    "巷道收敛监测 01", "锚索受力监测 01", "支架压力 03",
    "微震监测 01", "出口 CCTV 01",
]
```

- [x] **Step 2: Render the SVG**

Use grouped elements with `data-roadway-node`, `data-roadway-edge`, `data-equipment`, and `data-monitor` attributes. Include title, depth bands, full topology, inset, legend, and source note.

- [x] **Step 3: Render the PNG**

Use Pillow at 1600 x 1000 with a Chinese-capable system font. Draw from the same normalized coordinates and labels as the SVG.

- [x] **Step 4: Generate both files**

Run: `python tools/generate_threejs_underground_layout.py`

Expected: both output files are created under `competition_submission/figures/`.

- [x] **Step 5: Run the focused test**

Run: `node --test tests/underground-layout-figure.test.mjs`

Expected: PASS.

- [x] **Step 6: Commit generated deliverables**

```bash
git add tools/generate_threejs_underground_layout.py tests/underground-layout-figure.test.mjs competition_submission/figures
git commit -m "feat: add Three.js underground layout diagram"
```

### Task 3: Visual and regression verification

**Files:**
- Verify: `competition_submission/figures/threejs-underground-layout.png`
- Verify: `competition_submission/figures/threejs-underground-layout.svg`

**Interfaces:**
- Consumes: final generated files
- Produces: verified teacher-facing deliverables

- [x] **Step 1: Inspect the rendered PNG**

Open the PNG at original resolution and confirm that Chinese labels are readable, the inset does not overlap the topology, and the legend matches the plotted colors.

- [x] **Step 2: Validate SVG structure and PNG dimensions**

Run: `node --test tests/underground-layout-figure.test.mjs`

Expected: PASS with 1600 x 1000 dimensions and all required labels.

- [x] **Step 3: Run the full test suite**

Run: `node --test`

Expected: all tests pass.

- [x] **Step 4: Confirm a clean worktree**

Run: `git status --short`

Expected: no uncommitted project files.
