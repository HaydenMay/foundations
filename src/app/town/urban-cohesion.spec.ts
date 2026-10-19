import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { AssetLibrary } from './assets';
import { buildCityInfrastructure } from './city-assets';
import { CITY_MONORAIL_PLAN, CITY_SITE_PLAN } from './city-site-plan';
import { chapterTwoRoadFrameAtX } from './chapter-two-site-plan';
import { buildWorld } from './world';
import * as City from './city-site-plan';
import {
  CHAPTER_TWO_PROJECTS,
  CHAPTER_THREE_PROJECTS,
  CHAPTER_FOUR_PROJECTS,
} from '../domain/progression';
import { buildCityProjectForWorld } from './city-assets';
import { AssemblyAnimator } from './assembly';

describe('walkable urban composition', () => {
  it('continues the existing road tangent directly into a compact commercial street', () => {
    const main = CITY_SITE_PLAN.streets.roadSegments[0];
    const start = new T.Vector2(...main.from).add(
      new T.Vector2(CITY_SITE_PLAN.origin[0], CITY_SITE_PLAN.origin[2]),
    );
    const end = new T.Vector2(...main.to).add(
      new T.Vector2(CITY_SITE_PLAN.origin[0], CITY_SITE_PLAN.origin[2]),
    );
    const residential = chapterTwoRoadFrameAtX(61);
    expect(start.distanceTo(new T.Vector2(residential.x, residential.z))).toBeLessThan(0.1);
    expect(
      end
        .clone()
        .sub(start)
        .normalize()
        .dot(new T.Vector2(residential.tangentX, residential.tangentZ)),
    ).toBeGreaterThan(0.98);
    expect(start.distanceTo(end)).toBeLessThanOrEqual(45);
  });

  it('renders continuous sidewalks on both sides instead of crosswise strips', () => {
    const assets = new AssetLibrary();
    const infrastructure = buildCityInfrastructure(assets, new T.Group());
    infrastructure.updateMatrixWorld(true);
    for (const x of [5, 20, 35])
      for (const side of [-1, 1]) {
        const ray = new T.Raycaster(
          new T.Vector3(CITY_SITE_PLAN.origin[0] + x, 1, CITY_SITE_PLAN.origin[2] + side * 4.02),
          new T.Vector3(0, -1, 0),
          0,
          1,
        );
        const paving = ray.intersectObject(infrastructure, true).filter((hit) => hit.point.y > 0.3);
        expect(paving.length, `sidewalk at ${x}/${side}`).toBeGreaterThan(0);
      }
    assets.dispose();
  });

  it('places shop doors at the sidewalk edge rather than behind a grass setback', () => {
    const row = CITY_SITE_PLAN.projects.find((site) => site.id === 'city-main-street')!;
    const entry = new T.Vector3(0, 0, 3.42)
      .applyAxisAngle(new T.Vector3(0, 1, 0), row.rotation)
      .add(new T.Vector3(...row.position));
    expect(Math.abs(entry.z + CITY_SITE_PLAN.streets.sidewalkOffset)).toBeLessThan(1.1);
    expect(row.rotation).toBe(0);
  });

  it('keeps both station platforms out of the hanging-train channel', () => {
    const world = buildWorld({
      home: 'sage',
      'ch2-neighborhood': 'reveal',
      monorail: 'timber-brass',
    });
    const stations = world.projectAssets.get('monorail')!.pieces.get('stations')!;
    stations.updateWorldMatrix(true, true);
    for (const station of CITY_MONORAIL_PLAN.stations) {
      const ray = new T.Raycaster(
        new T.Vector3(
          CITY_MONORAIL_PLAN.origin[0] + station.position[0],
          12.7,
          CITY_MONORAIL_PLAN.origin[2] + station.position[2],
        ),
        new T.Vector3(0, -1, 0),
        0,
        2.4,
      );
      expect(ray.intersectObject(stations, true), station.id).toHaveLength(0);
    }
    world.assets.dispose();
  });

  it('validates a connected walking network and reports a severed station approach', () => {
    expect(typeof City.validateCityPedestrianNetwork).toBe('function');
    expect(City.validateCityPedestrianNetwork()).toEqual([]);
    const severed = City.cityPedestrianSegments().filter(
      (path) => !path.id.startsWith('town-station'),
    );
    expect(City.validateCityPedestrianNetwork(severed).join(' ')).toContain('town-station');
  });

  it('keeps freestanding guideway piers outside the suspended train envelope', () => {
    for (let index = 0; index < CITY_MONORAIL_PLAN.supportCount; index++) {
      const pier = City.monorailSupportPoint(index);
      let clearance = Infinity;
      for (let sample = 0; sample < 1000; sample++) {
        const track = City.monorailPointAt(sample / 1000);
        clearance = Math.min(clearance, Math.hypot(track.x - pier.x, track.z - pier.z));
      }
      expect(clearance).toBeGreaterThan(2.7);
    }
  });

  it('renders station approach segments at their authored coordinates, without doubling the district origin', () => {
    const world = buildWorld({
      home: 'sage',
      'ch2-neighborhood': 'reveal',
      monorail: 'timber-brass',
    });
    const approaches = world.projectAssets.get('monorail')!.pieces.get('station-approaches')!;
    approaches.updateWorldMatrix(true, true);
    for (const path of CITY_MONORAIL_PLAN.approaches) {
      const ray = new T.Raycaster(
        new T.Vector3(
          CITY_MONORAIL_PLAN.origin[0] + (path.from[0] + path.to[0]) / 2,
          1,
          CITY_MONORAIL_PLAN.origin[2] + (path.from[1] + path.to[1]) / 2,
        ),
        new T.Vector3(0, -1, 0),
      );
      expect(ray.intersectObject(approaches, true).length, path.id).toBeGreaterThan(0);
    }
    world.assets.dispose();
  });

  it('keeps the original home and every established neighbor asset unchanged when the city is present', () => {
    const designs = Object.fromEntries(
      CHAPTER_TWO_PROJECTS.map((project) => [project.id, project.choices[0].id]),
    );
    const base = buildWorld({ home: 'sage', 'ch2-neighborhood': 'reveal', ...designs });
    const expanded = buildWorld({
      home: 'sage',
      'ch2-neighborhood': 'reveal',
      ...designs,
      'city-main-street': 'bakery-row',
      monorail: 'timber-brass',
    });
    const bounds = (node: T.Object3D) =>
      new T.Box3().setFromObject(node).getSize(new T.Vector3()).toArray();
    expect(bounds(expanded.home!)).toEqual(bounds(base.home!));
    for (const project of CHAPTER_TWO_PROJECTS.filter((project) => project.lot)) {
      expect(bounds(expanded.projectAssets.get(project.id)!.root), project.id).toEqual(
        bounds(base.projectAssets.get(project.id)!.root),
      );
      expect(expanded.projectAssets.get(project.id)!.root.position.toArray()).toEqual(
        base.projectAssets.get(project.id)!.root.position.toArray(),
      );
    }
    base.assets.dispose();
    expanded.assets.dispose();
  });

  it('replays, skips and reduces motion for every reversible city design with exact final transforms', () => {
    for (const project of [...CHAPTER_THREE_PROJECTS, ...CHAPTER_FOUR_PROJECTS])
      for (const choice of project.choices) {
        const assets = new AssetLibrary();
        const asset = buildCityProjectForWorld(assets, new T.Group(), project.id, choice.id)!;
        const original = [...asset.pieces.values()].map((piece) => ({
          position: piece.position.toArray(),
          rotation: piece.quaternion.toArray(),
        }));
        const animator = new AssemblyAnimator(asset.root, asset.pieces, asset.recipe);
        animator.play();
        animator.update(0.35);
        expect(animator.skip()).toBe(true);
        animator.replay();
        animator.update(1);
        expect(
          [...asset.pieces.values()].map((piece) => ({
            position: piece.position.toArray(),
            rotation: piece.quaternion.toArray(),
          })),
          project.id + '/' + choice.id,
        ).toEqual(original);
        animator.dispose();
        const reduced = new AssemblyAnimator(asset.root, asset.pieces, asset.recipe, {
          reducedMotion: true,
        });
        reduced.play();
        expect(reduced.lifecycle).toBe('completed');
        reduced.dispose();
        assets.dispose();
      }
  });
});
