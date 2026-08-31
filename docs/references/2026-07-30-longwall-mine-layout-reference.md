# Longwall Mine Layout Reference

## Purpose

Use this note to correct Mine V2 underground composition. The current scene must not be judged by whether it has many roadways. It should be judged by whether it reads as one working underground coal mine system.

## Reference Sources

- Penn State MNG 230, "10.4.2c Longwall Mining": https://courses.ems.psu.edu/mng230/node/913
- NIOSH/CDC longwall ventilation article indexed on PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC9278540/
- Scielo longwall ventilation CFD study: https://scielo.org.za/scielo.php?pid=S2225-62532017000300010&script=sci_arttext

## Engineering Lessons To Apply

1. The mine should be organized by production logic, not by visually exposing every topology edge.

   A believable underground coal mine composition should show mains or submains feeding a panel. The longwall panel is defined by gateroads rather than by a decorative roadway web.

2. The longwall panel needs a headgate/tailgate relationship.

   The headgate side carries service and coal handling functions. The tailgate side is mainly return air and additional support. Our visual layout should make that relationship readable.

3. The working face is a line of machinery, not a separate room.

   The realistic order is coal wall, shearer on AFC, hydraulic shield supports, then gob/caved area. The stage loader/crusher and belt handoff belong near the headgate.

4. Roadways should be embedded in coal/rock.

   The atlas should show cutaway openings into the mine. It should not show the full exterior of tunnels like pipes in space.

5. Ventilation must be a route.

   Fresh air should read as intake toward the face, then return air leaves through tailgate/return entries. Fan/duct/camera/sensor placement should reinforce this, not float as unrelated objects.

6. Only roadways need internal entry.

   Pump room, substation, and longwall equipment zones should remain visible from the integrated atlas. Clicking them focuses the atlas camera. Clicking roadway entries can move into tunnel interiors.

## Composition Target For The Next Build

- Default underground view: one cut-open mine block.
- Foreground/left: portal or incline entering rock.
- Middle: main haulage and auxiliary service roadway visible as one or two opened slices.
- Deep/right: headgate belt and stage-loader handoff leading into the longwall.
- Longwall: coal wall + shearer/AFC + shields + gob in one readable line.
- Return side: tailgate/return airway with ventilation duct and return route markings.
- Non-exposed topology edges: hidden in geology or shown only as weak buried shadows.

## Rejection Checklist

Reject the scene if any of these are true:

- It looks like a rail transit map, subway map, or sci-fi orbit network.
- Roadway tubes are fully exposed in empty space.
- The first underground view is just one tunnel with distant equipment.
- Pump room, substation, or longwall opens as an unrelated separate interior.
- Longwall equipment is not ordered coal wall -> AFC/shearer -> supports -> gob.
- Vehicles or devices are hidden behind rock or sunk into floors.
