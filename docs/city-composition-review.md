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
