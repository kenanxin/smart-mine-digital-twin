# Mine V2 Validation

## Build

- Commit: `a2df354477acaebaef0870402f6f5f0b74a8ea29`
- Tested URL: `http://localhost:8082/?scene=v2&rev=21`
- Tested viewport: `1920x1080`
- Test date: `2026-07-29`
- Automated checks: `17/17 PASS`
- JavaScript syntax checks: `PASS`

## Visual Composition

- Surface: `PARTIAL PASS` - Mine V2 opens directly on the surface campus. The obsolete overview option and its suspended cutaway wall are absent. Terrain, roads, buildings, silos and surface vehicles are visible, but the campus remains a procedural medium-detail model and is not yet at the target reference quality.
- Underground: `PASS` - The camera is inside a continuous arched roadway with a floor, roof, sidewalls, steel arches, rails and service lighting. The view no longer presents the mine as a flat wall or floating slab.
- Working face: `PARTIAL PASS` - The camera reaches the equipment area and shows the shearer, hydraulic supports, conveyor, coal wall and nearby monitoring labels. Equipment materials, lighting and mechanical detail still require the planned fine-model pass.
- Overview: `REMOVED` - The page exposes only `Surface`, `Underground` and `Working Face`. Mine V2 defaults to `Surface`.

The browser captures were inspected during the validation run but were not archived as repository assets.

## Spatial Integrity

- `PASS` - The surface view hides the cutaway geology, so no underground mass appears suspended above the terrain.
- `PASS` - The underground camera remains within the arched roadway rather than intersecting the roof, floor or sidewall.
- `PASS` - The working-face camera remains in the roadway opening and keeps the active equipment visible.
- `PASS` - The approved roadway topology validator reports no disconnected edge, and the main incline reaches all three production horizons.

## Data Integrity

`window.__mineDiagnostics` and the UI registry reported:

```text
equipment: 12
running: 10
maintenance: 2
fault: 0
offline: 0
roof monitoring points: 12
data completeness: 100%
meshes: 1981
triangles: 126984
```

All equipment, monitor anchors, topology endpoints and threshold-state contracts passed the 17-test Node suite.

## Performance

Measured after a stable browser run:

```text
viewport: 1920x1080
first ready: 770 ms
sample duration: 162739 ms
average FPS: 26.1
meshes: 1981
triangles: 126984
geometries: 1885
textures: 29
project console errors/warnings: 0
```

Performance result: `FAIL`. The measured `26.1 FPS` is below the `40 FPS` target. Responsive viewport override was not reliable in the current browser environment, so mobile and alternate desktop sizes remain unverified rather than being marked as passed.

## Remaining Work

- Replace medium-detail surface buildings and vehicles with higher-quality industrial assets or finer procedural models.
- Continue the equipment fine-model pass for the shearer, hydraulic supports, conveyor and underground transport vehicles.
- Reduce draw overhead and geometry count while preserving the close-up silhouette and PBR material quality.
- Repeat visual and performance validation at desktop and mobile breakpoints after optimization.

## Decision

Keep query-only preview
