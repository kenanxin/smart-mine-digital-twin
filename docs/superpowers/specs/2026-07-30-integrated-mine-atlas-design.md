# Integrated Mine Atlas Design

## Goal

Rebuild Mine V2 underground presentation as one integrated coal mine atlas: a grounded surface mine and a buried underground mine shown in one readable composition, with roadway entry points that move the camera into realistic tunnel interiors.

The scene must stop reading as a floating roadway graph. The first underground view should look like a cut-open mine section, not a collection of exposed tubes or rails.

## User-Facing Success Criteria

- V2 still exposes only two main buttons: Surface and Underground.
- Underground opens to a complete mine atlas view: terrain and strata above, coal seam and mine openings below, roadways embedded inside rock mass.
- All important underground systems are visible in the same overall composition through cutaway windows, portals, labels, or selectable zone cards.
- Users can click into roadway interiors:
  - main haulage roadway
  - auxiliary transport roadway
  - return airway and ventilation route
- Pump chamber, central substation, and longwall mining area remain visible equipment zones in the atlas view; clicking them should focus/zoom the camera, not enter separate room interiors.
- Entered roadway views show nearby equipment and branches, not a long empty tunnel.
- Equipment list clicks locate the corresponding scene object or its operating zone.
- Monitor points and dashboard counts remain consistent with simulated data.
- Nothing appears suspended in air, buried in terrain by accident, or floating against a black void.

## Spatial Model

The underground scene becomes a mine atlas made from three nested layers:

1. Grounded surface layer
   - Existing surface scene remains the context above the underground system.
   - Terrain is continuous and blocks the feeling that the mine is floating.
   - Surface roads remain dirt haul roads in the open-pit area.

2. Cutaway geology layer
   - Add a large rock/coal mass volume behind and around underground spaces.
   - Use stratified materials: topsoil, sandstone/mudstone, coal seam, floor rock.
   - Cutaway faces reveal the mine interior like an engineering sectional model.
   - Roadway exterior shells should be hidden or visually fused into the rock mass.

3. Operating zones
   - Roadways, chambers, and longwall district are real spaces inside the geology layer.
   - The atlas view exposes selected openings and partial interiors.
   - Entering is limited to roadway interiors; non-roadway zones use focus camera positions inside the atlas view.

## Overall Composition

The underground atlas view should be arranged like this:

- Left/front: mine portal or incline entry connected to the surface industrial yard.
- Middle: mains/submains feeding a longwall panel, with main haulage and auxiliary transport area, locomotive/utility vehicle, pipes, rails, cables, lights, and CCTV.
- Right/deeper: pump chamber and substation as side chambers, each with visible industrial equipment.
- Far/deep coal seam: a longwall panel with headgate/intake side, tailgate/return side, coal wall, AFC/shearer, hydraulic support array, stage loader, and goaf.
- Return airway and ventilation duct should form a readable route from intake toward the face and out through the return side.

The visual grammar should be "a mine opened for inspection", not "a subway map in 3D".

## Navigation

There are two navigation levels:

- Atlas navigation:
  - Orbit around the integrated mine section with 360-degree horizontal rotation.
  - Camera distance is bounded so the scene remains readable.
  - Labels are sparse and attached to zones or major equipment only.

- Roadway inspection navigation:
  - Clicking a roadway entry point moves camera into a local roadway inspection preset.
  - Local roadway views are still orbit-style or constrained free-look, but start close to useful equipment and branches.
  - Roadway movement should not force the user to travel a long tunnel just to find devices.
  - Clicking pump room, substation, or longwall focuses the atlas camera on the visible zone instead of entering an interior.

Required zone presets:

- `atlas`
- `mainHaulage`
- `auxTransport`
- `returnAirway`
- `pumpRoom`
- `substation`
- `longwall`

The UI should not add a separate "workface" top-level interface. Longwall is an underground atlas focus target, not an internal navigation mode.

## Equipment Placement Rules

Equipment must be placed by mine function:

- Locomotive: on rail/main haulage route, visible from `mainHaulage`.
- Utility rubber-tire vehicle: on auxiliary transport route, not half-buried, scaled small enough to read as real.
- Conveyor: in coal transport route and connected to longwall/stage loader.
- Ventilation duct/fan equipment: in return/intake airway, mounted high or side-mounted as appropriate.
- Pump skid: inside the visible pump chamber zone, readable from atlas focus.
- Substation skid: inside the visible central substation zone, readable from atlas focus.
- CCTV cameras: mounted near junctions/chambers, not floating as standalone devices.
- Longwall equipment: coal wall, supports, AFC, shearer, stage loader, and goaf must preserve realistic ordering.

Every equipment item in the dashboard must map to one physical object or one zone anchor.

## Monitor And Data Rules

Monitor points are not arbitrary glowing dots. They must be anchored to physical locations:

- Roof pressure/separation: roof or support area.
- Support resistance: hydraulic support array.
- Convergence/subsidence: roadway side/roof locations.
- Ventilation/gas-related readings: intake/return roadway.
- Equipment status: actual equipment mesh or chamber zone.
- Cameras/personnel: mounted/positioned inside believable work areas.

The left/right dashboard numbers can remain simulated, but counts, labels, and visible scene anchors must agree.

## Visual Realism Rules

- The mine must sit in terrain and rock mass; underground should never appear to float.
- Avoid glowing rails, neon guide paths, oversized colored tubes, and sci-fi composition.
- Use dust, rough rock, dark coal, warm practical lamps, cable trays, drainage channels, and steel supports.
- Cutaway faces should look like rock/coal strata, not flat rectangular walls.
- For competition readability, the underground longwall production panel should be visually enlarged and treated as the primary focal area. The enlargement can be marked as a "schematic enlargement" when strict engineering scale would make equipment too hard to read.
- Underground vehicles must be large enough to recognize as mine vehicles from the default atlas view.
- The return-air duct should be short, thick, and clearly labeled so the ventilation route reads immediately.
- Add concise labels for any intentionally enlarged or schematic element so judges understand the purpose even when exact engineering scale is simplified.
- Vehicles should be slow and physically plausible.
- Vehicle wheels rotate only according to traveled distance along the path.
- Dirt haul roads on surface, no asphalt-like road belts in the open pit.

## Implementation Boundaries

- Do not modify `js/scene/integrated-mine.js`.
- Keep legacy `/` behavior visually unchanged.
- Mine V2 remains query-controlled through `/?scene=v2`.
- Preserve existing loaded licensed assets and attribution files.
- Preserve simulator and dashboard integration, but improve mapping to visible locations.
- Keep performance target at 40 FPS or better at desktop size.

## Proposed Code Structure

- `js/scene/mine-v2/mine-atlas.mjs`
  - Builds geology mass, cutaway windows, zone anchors, and atlas-level grouping.
- `js/scene/mine-v2/zone-presets.mjs`
  - Exports atlas/internal camera presets and zone metadata.
- `js/scene/mine-v2/topology.mjs`
  - Simplify route geometry so it supports spatial logic without forcing visual graph display.
- `js/scene/mine-v2/roadway-network.js`
  - Build embedded roadway interiors for selected exposed/opened sections.
- `js/scene/mine-v2/underground-asset-layout.mjs`
  - Reposition assets by zone and expose role/zone mappings.
- `js/scene/mine-v2/scene-adapter.js`
  - Add focus methods for equipment and zone navigation.
- `js/main.js`
  - Hook equipment list clicks to focus behavior.
- `tests/mine-v2-config.test.mjs`
  - Add contracts for zone IDs, equipment mappings, camera presets, and no top-level workface mode.

## Acceptance Checks

- Surface mode: grounded open-pit/surface facilities, dirt roads, no exposed underground graph.
- Underground atlas mode: one integrated mine section with embedded roadways and readable operating zones.
- Roadway internal views: each roadway entry opens with relevant equipment visible within the first screen.
- Non-roadway zone focus: pump room, substation, and longwall remain in the integrated atlas composition and do not open separate interiors.
- Equipment clicks: all dashboard equipment entries focus something visible.
- Data consistency: equipment totals and monitor counts match scene contracts.
- Browser QA: canvas nonblank, scene framed correctly, 360-degree atlas orbit works, no buried/floating vehicles, no black void framing the mine.
