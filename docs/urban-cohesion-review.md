# Urban cohesion review

## Baseline and diagnosis

Starts from current main `ce9506d8` (merged PR #6), not its old feature branch. Baseline: 256 tests pass; production build passes. Fixed-camera production evidence is in `evidence/urban-cohesion/before/`; the older galleries are preserved.

The five significant disconnections, visible in the new afternoon captures:

1. **Broken street edge:** Main Street sidewalks/curbs receive the segment yaw twice. At the gameplay view they are crosswise strips across the road, not continuous sidewalks. The ribbon connector also presents its underside from above, so the Chapter 2 road appears to stop at grass.
2. **Wrong hierarchy:** the north/south commercial street turns away from the residential approach, leaving the library as an isolated large object at the transition. The unnecessary long north/south road amplifies the gap.
3. **Road through shop frontage:** the civic lane at local z=12 crosses the narrow gap between the bookshop and market and intrudes on their envelopes. Plaza access is consequently a road across a building row rather than a pedestrian destination.
4. **Stations do not meet their paths:** the approach renderer adds the monorail origin a second time, while graph anchors describe different endpoints. Station platforms run crosswise to their canopies/track; stairs hang as disconnected flights, and the lift sits in the train channel. Anchor proximity alone did not catch these visible defects.
5. **Unassigned lawn:** broad grass strips behind shops, between public sites, and inside the loop have no legible edges or connected use. Chapter 3 borrows an oversized expansion slab before rail exists.

## Single composition

Continue the existing road east from its endpoint (61, 5.2), without moving any established home, residential plot, or road frontage. Use a short, straight commercial street: closely spaced shops on its north sidewalk, the library opposite, and a civic square closing the east end. Remove the vehicular civic lane through the shops. Use real entry-aligned walks, a continuous paved frontage, two marked crossings, and a planted residential/commercial threshold.

Join the square to the greenway on its north edge. Connect that civic green to the established park/landmark promenade behind the houses. Bound the space behind the shops as a quiet commons and the library's southern open land as a reading green, connected in a walking loop. Use modest shared canopy geometry and retained materials to define edges without a forest of expensive decorative assets.

Move Neighborhood Station beside the existing park/landmark promenade and Town Station beside the civic square. Author station rotations, real lift entrances and approach segments in the site plan. Platforms align with the track and stay clear of the hanging train; stairs connect successive landings beside one platform, and the lift connects the other. Narrow the loop around this elongated town and reduce its terrain envelope. Keep Chapter 3 a complete composition before rail exists.

The rail inspection also exposed centerline piers intersecting the suspended coach envelope. Free piers now stand 3.1 m outside the track, with cantilever caps above the vehicle. Station crossheads replace free piers inside station footprints, and boundary piers prevent long unsupported spans. The measured maximum physical span, including station heads and the closing loop, is 10.97 m against the unchanged 12 m limit. The library now has finished side/rear window elevations toward its reading walk, and the street surface matches the existing residential asphalt.

## Execution and acceptance

1. Pin rendered sidewalks, approach transforms, rail-channel clearance and connected destination paths with focused tests, then recompose the authoritative plan and dependent meshes.
2. Validate hierarchical plots, street/structure separation, pedestrian graph continuity, rail closure/tangents/support spacing, and station access. All existing saves, rewards, project IDs/choices, preview, assembly and lifecycle tests remain in the full suite.
3. Build and inspect the same fixed-camera before/after production views, plus day/night, both stations, Chapter 3/4, mobile, and assembly/reduced motion. Repair visible failures. Produce a labeled plan and record comparable renderer counters with software-renderer caveats.
4. Commit/push `agent/codex/urban-cohesion`, open a draft PR, and stop without merging or deploying.

## Review repairs

Read-only code review identified a rigid trailing coach sweeping into an offset pier on curves and overlapping staircase flights. Both were reproduced before fixing. Each coach now follows its own arc-length-spaced guideway pose through the existing shared animation loop. A 480-sample full-lap test checks both actual coach envelopes against every free pier. Station stairs alternate lanes with connected turning landings and clear support columns; a raycast checks lower-flight headroom. Boarding surfaces were also lowered from 12.37 m to 10.525 m to meet the suspended coach floor, with matching lifts and stair rise. No animation loop, progression, save format or original-home camera changes were added.

The upper stair flights now sit entirely outside the boarding deck, rather than below it. Both stations include the widened outboard stair footprint in their plot bounds, with a connected forecourt and an opening in the upper guardrail. Headroom checks sample forty tread positions per station, across all four flights. Final regression run: 34 files / 267 tests passed; production build passed. Plot, clearance and pedestrian diagnostics are empty.
