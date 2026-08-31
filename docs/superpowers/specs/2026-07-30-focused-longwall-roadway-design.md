# Focused Longwall Roadway Design

## Goal

Build a focused underground coal mine scene for the roof-disaster warning demo. The scene must show one realistic longwall face exit and one complete 50 m transport roadway, not a full mine network.

## Scope

- Working face: only the 18-20 m segment next to the roadway exit.
- Transport roadway: one 50 m roadway.
- Roadway section: about 5.2 m wide and 3.8 m high.
- Working face mining height: about 4 m.
- Hydraulic supports: 10-12 supports near the face exit.
- Primary viewpoint: near the face exit, looking across the working face equipment and down the roadway depth.

The scene excludes roadway networks, second roadways, locomotives, rails, pump rooms, substations, surface facilities, and unrelated decorative equipment.

## Spatial Layout

The working face and transport roadway are approximately perpendicular.

Working face order:

`goaf -> hydraulic supports -> AFC + shearer -> coal wall`

Coal transport order:

`AFC -> stage loader -> crusher -> belt conveyor`

Roadway layout:

- 0-12 m: stage loader transition area.
- 8-16 m: crusher area.
- 12-50 m: belt conveyor.
- 0-20 m: advance support and primary roof monitoring area.
- 20-50 m: conveyor depth, lighting, pipes, cables, drainage, dust, and repeated roof support.

## Equipment

Primary dashboard equipment:

- Hydraulic supports.
- Shearer.
- AFC.
- Belt conveyor.

Connection equipment:

- Stage loader.
- Crusher.

The stage loader and crusher are visible and selectable in the scene, but they should not expand the dashboard into a large unrelated equipment catalog.

## Roof Monitoring

Monitoring must be physically attached to the roadway, support, or equipment. No floating glowing sensor spheres.

Required monitoring objects:

- Roof separation instruments at the roadway roof center line in the 0-20 m zone.
- Roadway convergence monitoring between roof and side walls.
- Anchor bolt or cable load monitoring bound to specific bolts/cables.
- Hydraulic support pressure monitoring bound to specific support shields.
- Microseismic or vibration monitors mounted on the side wall or roof.
- One CCTV unit near the face exit.

Alarm visualization:

- Local roof cracks brighten in warning zones.
- Bolts, cables, or support indicators change green/yellow/red.
- A subtle translucent roof hazard overlay marks the affected area.
- The side panel reports roof separation, convergence, anchor load, support resistance, and microseismic events.

## Materials And Lighting

The roadway must read as an underground coal mine at first glance:

- Dark coal-rock walls and roof with irregular stratification, coal dust, cracks, and local spalling.
- Floor with coal fines, machine tracks, small puddle reflections, and drainage detail.
- Clear roof bolts, anchor cables, steel straps, wire mesh, and selective steel ribs.
- Denser advance support near the face exit.
- Industrial low-light lamps with uneven illumination and darker roadway depth.
- Coal dust and worn metal on supports, conveyors, crusher, and shearer.

The opening camera must show coal wall, hydraulic supports, AFC, stage loader/crusher entrance, roadway support, and belt depth.

## Navigation And Tracking

The user must be able to rotate, pan, and zoom the scene freely with 360 degree OrbitControls.

The left equipment list must provide tracking:

- Clicking a machine or instrument flies the camera to its real scene position.
- The target is highlighted with outline or pulse.
- The right panel shows name, installation position, roadway meter mark, state, and live value.
- A scene label/number appears on the selected object.
- A return-to-exit-view control restores the default camera.

Instrument location examples:

- Roof separation instrument 03: roadway 16 m, roof center line.
- Convergence station: roadway 10 m, left/right wall and roof measuring line.
- Anchor load: specific roof bolt or cable near roadway 12 m.
- Support pressure: specific hydraulic support near the face exit.
- CCTV: face exit roof or side-wall bracket.

## Performance And Failure Handling

Build the scene with reliable procedural geometry first. Local or downloaded models may enhance the scene only when they are affordable to render and load reliably.

Hard requirements:

- The first screen must never be blank.
- If external models or textures fail, procedural mine geometry remains visible.
- The default camera frames the face exit and 50 m roadway depth.
- High-poly models must be simplified, instanced, or replaced with procedural versions.
- 10-12 supports should use repeated geometry or instancing where practical.
- Equipment order must not be reversed.
- Browser QA must verify a nonblank canvas, correct framing, no major floating equipment, no large intersection errors, and monitoring objects attached to real structures.

## Reusable Sources

Useful local code:

- `D:/矿业/smart-mine-digital-twin-roof-warning/js/scene/photoreal-mine.js`
- `D:/矿业/smart-mine-v2-balanced/js/scene/mine-v2/working-face.js`
- `D:/矿业/smart-mine-v2-balanced/js/scene/mine-v2/roadway-network.js`

Useful external references:

- `three-tunnel` for tunnel extrusion/section logic.
- Free hydraulic support and coal conveyor references only if licenses and performance are acceptable.

## Acceptance

The implementation is acceptable only when the user can open the page, immediately recognize a realistic underground longwall face exit and transport roadway, rotate 360 degrees, click left-side equipment names to locate machines/instruments, and see roof-warning monitoring tied to real physical positions.
