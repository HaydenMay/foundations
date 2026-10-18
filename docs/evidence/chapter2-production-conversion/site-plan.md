# Chapter 2 production site plan

This is the authored overhead site-plan view rendered directly from `CHAPTER_TWO_SITE_PLAN` and the same road spline used by the production assets. Measurements are metres. North is up; world +Z is up in the drawing.

![Labeled Chapter 2 production site plan](site-plan.png)

| Parcel | Property width × depth | Planned house width × depth × height | Side / back / front inset | Street frontage |
|---|---:|---:|---|---|
| Chapter 1 (existing) | 14 × 13.5 | 8.85 × 7.87 × 6.58 measured | sides 4.60 / 0.55; back/front 4.29 / 1.35 | unchanged |
| Neighbor 1 | 13 × 12 | 7.4 × 6.4 × 5.7 | sides 2.80 / 2.80; back/front 1.50 / 4.10 | north |
| Neighbor 2 | 14.5 × 14.5 | 9.6 × 8.3 × 6.9 | sides 2.20 / 2.70; back/front 1.95 / 4.25 | south |
| Neighbor 3 | 15.5 × 16 | 10.5 × 8.7 × 8.8 | sides 2.50 / 2.50; back/front 2.05 / 5.25 | north |
| Neighbor 4 | 15 × 15 | 11.2 × 8.1 × 7.1 | sides 1.90 / 1.90; back/front 2.10 / 4.80 | south |

The curved carriageway is 6.3 m wide, with 1.48 m public sidewalks centered 4.02 m from the road centerline. The district contract is 132 × 90 m. Neighbor frontage is placed 4.76 m from the road centerline.

The minimum private property edge clearance is **2.35 m**, between the unchanged Chapter 1 property and Neighbor 1. The nearest five measured pair clearances are:

| Property pair | Edge clearance |
|---|---:|
| Chapter 1 ↔ Neighbor 1 | 2.35 m |
| Neighbor 1 ↔ Neighbor 2 | 7.89 m |
| Neighbor 2 ↔ Neighbor 3 | 9.12 m |
| Neighbor 3 ↔ Neighbor 4 | 11.06 m |
| Neighbor 2 ↔ Neighbor 4 | 18.25 m |

Public feature footprints and nearest private-property clearances:

| Public site | Width × depth | Nearest private-property clearance |
|---|---:|---:|
| entrance | 8.4 × 3.2 | 2.80 m to Neighbor 1 |
| community-park | 20 × 16 | 2.90 m to Neighbor 3 |
| landmark | 12 × 10 | 6.02 m to Neighbor 3 |

Driveways and front walks remain owned by their residential lot and intentionally cross only the front boundary to reach the public sidewalk (0.74 m beyond the property frontage). The entrance connects the north sidewalk to the park approach; the park and landmark share a public promenade. The original Chapter 1 property and home coordinates remain unchanged. No vehicle assets are included.

The SVG and JSON data can be regenerated together with `node scripts/render-chapter-two-site-plan.cjs`.
