# City Composition Review

## Before-pass diagnosis

The committed production captures show three concrete causes of the disconnected feel:

- Chapter 2's road terminates at world position `(61, 5.2)`, while the Town Center's main street is centered at `x=90`. The spline joins them, but it spends roughly 30 metres crossing open lawn before reaching the downtown street.
- The Town Center uses a full 82-metre north/south road plus a 43-metre east/west road. Three storefronts sit along one side, while the library, square, and greenway are placed separately around the grid. At normal camera distance this reads as roads and landmarks scattered across an oversized grass field, rather than a legible downtown block.
- The monorail's authored route spans about 200 by 122 metres, while the active neighborhood and civic plots occupy a much smaller portion. The large loop and remote station approaches dominate the camera view; the current town street itself also ends without a strong public destination.

The close views confirm that the Chapter 3 assets have usable silhouettes and facade detail, but the wide composition weakens them. Chapter 2's lots have intentionally generous spacing and remain the residential benchmark; the fix therefore tightens the transition and public realm, not the house lots.

## Revised composition

Keep the established home and Chapter 2 coordinates. Move only the Town Center origin west from `x=90` to `x=76`, and move its connector start so it still meets the existing road endpoint exactly. Use one short north/south Main Street spine for the shop frontage and library, with a short side street that terminates at the civic square. Bring the square and greenway together as a contiguous civic/park pair; shorten the library walk and shop approaches to match their doors and sidewalks. Concentrate planting at the Chapter 2-to-town transition and public-space edges so the remaining lawn reads as intentional green space.

Reduce the Chapter 4 route to an oval around the actual built footprint, with its west station beside the neighborhood road end and its east station beside the greenway. Keep the same route height, two stations, train motion, clearances, IDs, and progression. Validate the continuous road joins, storefront access, public-space links, loop closure, station-to-path links, route envelope, and support spacing after the move.

The composition remains a single world with future room to expand. The visual pass does not alter Chapter 1/2 homes, IDs, rewards, saved selections, or camera Home framing.

## Final review

The Town Center now begins at `x=76`; its connector meets the existing Chapter 2 road, Main Street uses a short frontage spine, and the civic square and greenway form one public-space pair. Shop placement uses the site-plan offsets, and each storefront walk reaches its actual entry. The Chapter 4 oval was shortened around the active town, both station approaches remain connected, and static station geometry is batched under the existing station pieces. Before the monorail is built, Chapter 3 uses a 170-by-100 metre terrain slab; it expands in place to 200-by-120 metres when the rail is unlocked, keeping project coordinates continuous.

Visual inspection of the production library capture found that its gable siding and attic window were hidden behind the roof's solid triangular end caps. The library panels now sit just outside the cap planes (`z=±5.365` for the roof ends at `±5.35`), with the attic window on the same facade. Its gables use the same generated finish as the walls, and its roof shares the generated shingle material. A focused geometry test checks the visible depth relationship.

The revised town reads more connected than the baseline at normal view: the Chapter 2 street leads into Town Center, Main Street storefronts connect directly to walks, and the public square joins the greenway. Chapter 2's spaced residential lots are unchanged. The full-loop view now frames the active footprint rather than extending hundreds of metres beyond it.

## Remaining visual and performance limits

The city still has open grass around and between current districts, especially inside the monorail loop. It provides breathing room for later continuous-world growth, but the high overhead view remains less densely composed than the visual references. The current procedural architecture also uses simplified geometry and small generated textures; it is a coherent low-poly pass rather than reference-board fidelity.

On the emulated 844-by-390 monorail view, the current production bundle reports 935 draw calls and 1,038,214 triangles, versus 890 draw calls and 1,082,735 triangles in the previous PR capture. This is 45 more calls and 44,521 fewer triangles; both captures use the same named scenario and viewport, but the composition and camera were updated, so treat this as a renderer-counter comparison rather than a controlled benchmark. Headless Chromium used SwiftShader and measured approximately 5 FPS in portrait and 2 FPS in landscape; those software-renderer timings do not predict a physical phone. A real-device performance pass remains necessary before calling mobile frame pacing verified.
