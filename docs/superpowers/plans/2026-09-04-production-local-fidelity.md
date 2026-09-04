# Production Local Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the exact local 4K HDR, PBR textures, and detailed runtime GLB models through Vercel so production and local scene quality match.

**Architecture:** Keep the existing asset URLs and Three.js rendering path unchanged. Override the broad Git LFS rules only for the 21 runtime-critical files, recommit their real binary bytes as ordinary Git blobs, and retain the existing runtime fallback behavior for exceptional network failures.

**Tech Stack:** Git attributes, Git LFS 3.7, Node.js test runner, Three.js 0.160.0, Vercel static deployment.

## Global Constraints

- Production must use the original `quarry_02_4k.hdr`; do not reduce HDR resolution.
- Production must use all 18 source PBR textures registered by `TEXTURE_ASSETS`; do not compress or resize them.
- Production must use the original optimized conveyor and CCTV GLB files loaded by `focused-longwall.js`.
- Keep current asset URLs and Three.js render settings unchanged.
- Keep HDR, texture, and procedural-model fallbacks as exceptional protection.
- Expected production transfer is approximately 59.67 MB and an initial wait of 10 to 30 seconds is accepted.

---

### Task 1: Lock the production asset contract

**Files:**
- Create: `tests/production-assets.test.mjs`
- Modify: `.gitattributes`

**Interfaces:**
- Consumes: `TEXTURE_ASSETS` and `MODEL_ASSETS` from `js/scene/asset-registry.js`.
- Produces: a test-enforced list of 21 production files and Git attribute exceptions that store them outside LFS.

- [ ] **Step 1: Write the failing contract test**

Create a Node test that imports the asset registries, resolves the 4K HDR, all 18 PBR texture URLs, and the conveyor/CCTV model URLs, then asserts:

```js
assert.equal(runtimeAssets.length, 21);
assert.match(attributes, /assets\/hdri\/quarry_02_4k\.hdr -filter -diff -merge -text/);
assert.match(attributes, /assets\/textures\/\*\* -filter -diff -merge -text/);
assert.match(attributes, /assets\/models\/quarry-conveyor-system-kit\/scene\.optimized\.glb -filter -diff -merge -text/);
assert.match(attributes, /assets\/models\/weathered-cctv-camera\/scene\.optimized\.glb -filter -diff -merge -text/);
```

The test must also check `#?RADIANCE` for HDR, JPEG magic bytes for textures, `glTF` for GLB files, and a combined size between 59 MB and 61 MB.

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `node --test tests/production-assets.test.mjs`

Expected: FAIL because `.gitattributes` does not yet contain runtime-file exceptions.

- [ ] **Step 3: Add precise Git LFS exceptions**

Append these rules after the existing broad LFS rules:

```gitattributes
assets/hdri/quarry_02_4k.hdr -filter -diff -merge -text
assets/textures/** -filter -diff -merge -text
assets/models/quarry-conveyor-system-kit/scene.optimized.glb -filter -diff -merge -text
assets/models/weathered-cctv-camera/scene.optimized.glb -filter -diff -merge -text
```

- [ ] **Step 4: Run the contract test and verify it passes**

Run: `node --test tests/production-assets.test.mjs`

Expected: PASS with 21 valid original binary resources totaling approximately 59.67 MB.

- [ ] **Step 5: Commit the contract and attribute rules**

```powershell
git add -- .gitattributes tests/production-assets.test.mjs
git commit -m "test: define production scene asset contract"
```

### Task 2: Store the production resources as ordinary Git blobs

**Files:**
- Modify: `assets/hdri/quarry_02_4k.hdr`
- Modify: `assets/textures/**`
- Modify: `assets/models/quarry-conveyor-system-kit/scene.optimized.glb`
- Modify: `assets/models/weathered-cctv-camera/scene.optimized.glb`

**Interfaces:**
- Consumes: the `.gitattributes` exceptions from Task 1.
- Produces: 21 ordinary Git blobs containing the exact local binary bytes.

- [ ] **Step 1: Renormalize only the runtime resources**

Run:

```powershell
git add --renormalize -- assets/hdri/quarry_02_4k.hdr assets/textures assets/models/quarry-conveyor-system-kit/scene.optimized.glb assets/models/weathered-cctv-camera/scene.optimized.glb
```

- [ ] **Step 2: Verify Git no longer applies the LFS filter**

Run:

```powershell
git check-attr filter -- assets/hdri/quarry_02_4k.hdr assets/textures/dark_rock_02/dark_rock_02_diff_2k.jpg assets/models/quarry-conveyor-system-kit/scene.optimized.glb assets/models/weathered-cctv-camera/scene.optimized.glb
```

Expected: each path reports `filter: unset`.

- [ ] **Step 3: Verify staged objects are binary data, not pointers**

Use `git show :<path>` for the HDR and both GLBs and check their first bytes. Expected signatures are `#?RADIANCE` and `glTF`; none may begin with `version https://git-lfs.github.com/spec/v1`.

- [ ] **Step 4: Commit the real runtime assets**

```powershell
git commit -m "fix: publish full-quality scene assets"
```

### Task 3: Run local regression and integrity checks

**Files:**
- Test: `tests/production-assets.test.mjs`
- Test: `tests/scene-resilience.test.mjs`

**Interfaces:**
- Consumes: the ordinary Git resource blobs from Task 2.
- Produces: evidence that exact assets and application behavior remain valid.

- [ ] **Step 1: Run all automated tests**

Run: `node --test`

Expected: all tests pass, including production asset signatures and HDR fallback behavior.

- [ ] **Step 2: Run the real-data submission preflight**

Run: `node tools/submission-preflight.mjs --offline`

Expected: `预检通过。` and the existing 20,000-row CSV fingerprint.

- [ ] **Step 3: Check repository consistency**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors and no uncommitted changes.

### Task 4: Deploy and verify production fidelity

**Files:**
- No source changes.

**Interfaces:**
- Consumes: GitHub `main` containing the exact binary resources.
- Produces: a Vercel Production deployment with the same scene assets as local.

- [ ] **Step 1: Push `main` to GitHub**

Run: `git push origin main`.

Expected: the commits through the full-quality asset commit are present on `origin/main`.

- [ ] **Step 2: Wait for the Vercel deployment**

Open the project deployment page and confirm the new `main` deployment is `Ready`, `Production`, and assigned to `smart-mine-v2-balanced.vercel.app`.

- [ ] **Step 3: Verify production resource responses**

Check the production HDR, representative texture, and both GLB URLs. Expected response sizes and signatures must match the local files and must not contain an LFS pointer.

- [ ] **Step 4: Verify the authenticated Three.js scene**

After enterprise login, open `/?scene=v2&view=underground&field=risk&portal=enterprise`, wait up to 30 seconds, and assert a non-empty canvas, a populated `data-meshes` and `data-triangles`, no `井下场景加载失败`, and no HDR/GLB parser errors.

- [ ] **Step 5: Compare local and production views**

Inspect underground and surface views at the same presets. Confirm the 4K environment, PBR rock/metal surfaces, conveyor model, CCTV model, lighting, and camera framing match the local deployment.
