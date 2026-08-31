# Underground Mine Asset Sourcing

This list records candidates verified through the Sketchfab public API on 2026-07-29. Installed assets are stored as separate glTF packages under `assets/models/`.

## Selection Rules

- Use only assets with an explicit reusable license and retain author/source attribution.
- Keep a normal scene asset below roughly 80,000 faces; decimate heavier assets before browser use.
- Reject stylized workers, fantasy props, old hand carts, and unrelated vehicles even when they are free.
- Use external models as replaceable detail modules. Roadway topology and equipment positions remain project-owned data.

## Approved For Direct Integration

| Role | Model | Author | License | Faces | Decision |
| --- | --- | --- | --- | ---: | --- |
| Belt conveyor modules | [Quarry Conveyor system Kit](https://sketchfab.com/3d-models/quarry-conveyor-system-kit-badf50e9d6ea47ac814e1cae037799ed) | Dumokan Art | CC BY | 37,792 | Reuse selected frames, rollers and drive modules in the belt roadway. |
| Rail locomotive | [Narrow gauge electric locomotive](https://sketchfab.com/3d-models/narrow-gauge-electric-locomotive-9863ce9aa4c449758a304a92dbb03d6f) | Lyskilde | CC BY | 27,374 | Reuse after wheel-node inspection and scale calibration. |
| Ventilation duct | [Modular Ventilation Duct Kit Free](https://sketchfab.com/3d-models/modular-ventilation-duct-kit-free-d4e35aa0424a43ec9f34d7f8341236a0) | AMMediaGames | CC BY | 7,240 | Reuse along the upper sidewall, never through the roadway center. |
| Industrial props | [Industrial asset pack (Free)](https://sketchfab.com/3d-models/industrial-asset-pack-free-94c5011772a84e8791779b342467f245) | ForevereQ | CC BY | 64,179 | Extract only cabinets, drums, barriers and maintenance props. |
| CCTV | [Weathered CCTV Security Camera](https://sketchfab.com/3d-models/weathered-cctv-camera-rigged-256f864b503d4ff9becbb08d1f51dee7) | garwiglino1 | CC BY | 1,022 | Reuse at junction and chamber entrances. |
| Pump room | [Centrifugal Pump - Horizontal End Suction](https://sketchfab.com/3d-models/none-dee0b9325925453eb20acfcbeb1add91) | Public API result | CC BY | 59,872 | Reuse one optimized source mesh and instance a three-pump set. |
| Conveyor safety | [Austdac Pullkey ESS3](https://sketchfab.com/3d-models/none-2460b87d553349d38cd69e4b0bf130eb) | Public API result | CC BY | 63,228 | Use sparingly as a close-range emergency pull-wire switch. |

## Reference Or Decimation Only

| Role | Model | License | Faces | Decision |
| --- | --- | --- | ---: | --- |
| Rock geometry and material | [Ferriere Mines - Lower Tunnels](https://sketchfab.com/3d-models/ferriere-mines-lower-tunnels-17ba7a7ddbfb4d17a86ea1b405c9f5ea) | CC BY | 1,005,043 | Reference irregular wall relief, damp floor and light falloff. Do not load the original million-face GLB. |
| Roadheader | [PK-3R Roadheader](https://sketchfab.com/3d-models/pk-3r-roadheader-e89ca2fe0f9f41b88780632269de9e30) | CC BY | 933,903 | Decimate below 80,000 faces or rebuild the visible silhouette procedurally. |
| Conveyor weathering | [Abandoned mining conveyor](https://sketchfab.com/3d-models/none-b1f57fca74bd47d69e91754ceb6f0559) | CC BY | 877,176 | Material and wear reference only; the modular conveyor kit is the production asset. |

## Explicit Rejections

- `Low-Poly Construction workers`: proportions and shading would reintroduce the toy-like appearance. Workers remain hidden until a credible replacement exists.
- `Mine cart Rusted` and other medieval carts: wrong for the modern coal-mine period shown by the dashboard.
- Generic surface dump trucks: wrong clearance and articulation for the underground auxiliary roadway.
- Sci-fi electrical cabinets: visually incompatible with a real central substation.

## Must Be Built In Project

- Horseshoe roadway shell, steel arch supports, rock bolts, mesh, drainage ditch and junction transitions.
- Low-profile rubber-tyred personnel/utility vehicle with correctly rotating wheels.
- Longwall hydraulic support, shearer, armored face conveyor, stage loader and crusher.
- Mine flameproof switchgear and transformer enclosure based on real product proportions.

## Download Status

The following source packages are installed locally: Ferriere tunnel scan, industrial asset pack, ventilation duct kit, narrow-gauge locomotive, quarry conveyor kit, and weathered CCTV. Each package retains its original `license.txt`, `scene.gltf`, `scene.bin`, and textures.

Optimized browser-ready files are stored as `scene.optimized.glb` beside each source package:

| Asset | Optimized size | Triangles | Treatment |
| --- | ---: | ---: | --- |
| Ferriere tunnel scan | 7.48 MB | 181,081 | 8K to 2K texture, welded geometry, 18% simplification, WebP quality 88. |
| Industrial asset pack | 7.80 MB | 64,179 | 1K maximum textures, WebP quality 86. |
| Ventilation duct kit | 0.82 MB | 7,240 | 1K maximum textures, WebP quality 86. |
| Narrow-gauge locomotive | 4.81 MB | 27,374 | 4K to 1K textures, WebP quality 86. |
| Quarry conveyor kit | 2.88 MB | 37,792 | 1K maximum textures, WebP quality 86. |
| Weathered CCTV | 0.76 MB | 1,022 | 1K maximum textures, WebP quality 86. |

The roadheader, mine cart, worker, pump and conveyor pull-key are not installed. Entries in `js/scene/asset-registry.js` expose an `installed` flag so integration code can exclude missing candidates.
