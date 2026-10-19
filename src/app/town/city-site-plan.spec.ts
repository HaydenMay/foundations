import { describe, expect, it } from 'vitest';
import * as T from 'three';
import {
  CITY_MONORAIL_PLAN,
  CITY_SITE_PLAN,
  cityPlotDefinition,
  monorailPointAt,
  validateCityClearances,
} from './city-site-plan';
import { resolvePlotPoint, validatePlot } from './plot-framework';
import { buildWorld } from './world';
import { CITY_CAMERA_BOUNDS, clampCamera } from './camera';

describe('continuous city site plan', () => {
  it('keeps every commercial, civic, path, and station plot inside its district hierarchy', () => {
    const definition = cityPlotDefinition();
    expect(validatePlot(definition)).toEqual([]);
    expect(definition.nodes.some((node) => node.id === 'chapter-two-district')).toBe(true);
    expect(definition.nodes.every((node) => !node.id.startsWith('legacy-world-'))).toBe(true);
    expect(
      CITY_SITE_PLAN.projects.every((site) =>
        definition.nodes.some(
          (node) => node.id === site.nodeId && node.parentId === 'town-center-district',
        ),
      ),
    ).toBe(true);
  });

  it('connects the eastern street extension to Chapter 2 and all public destinations to paths', () => {
    const definition = cityPlotDefinition();
    const accessConnections =
      definition.connections?.filter((connection) => connection.kind === 'access') ?? [];
    expect(accessConnections.length).toBeGreaterThanOrEqual(8);
    expect(
      accessConnections.some(
        (connection) =>
          connection.from.nodeId === 'ch2-road' || connection.to.nodeId === 'ch2-road',
      ),
    ).toBe(true);
    expect(
      definition.nodes
        .filter((node) => node.role === 'public-space' || node.role === 'structure')
        .filter((node) => node.anchors?.some((anchor) => anchor.requiresConnection))
        .every((node) =>
          accessConnections.some(
            (connection) => connection.from.nodeId === node.id || connection.to.nodeId === node.id,
          ),
        ),
    ).toBe(true);
    for (const connection of accessConnections) {
      const point = (endpoint: typeof connection.from) => {
        const node = definition.nodes.find((candidate) => candidate.id === endpoint.nodeId)!;
        const anchor = node.anchors!.find((candidate) => candidate.id === endpoint.refId)!;
        return resolvePlotPoint(definition, endpoint.nodeId, anchor.position);
      };
      if (connection.maxDistance !== undefined)
        expect(point(connection.from).distanceTo(point(connection.to))).toBeLessThanOrEqual(
          connection.maxDistance + 0.001,
        );
    }
  });

  it('defines a closed elevated monorail with safe structure clearance and bounded support spans', () => {
    expect(CITY_MONORAIL_PLAN.closed).toBe(true);
    expect(
      CITY_MONORAIL_PLAN.minimumTrackY - CITY_MONORAIL_PLAN.maximumStructureY,
    ).toBeGreaterThanOrEqual(CITY_MONORAIL_PLAN.minimumStructureClearance);
    expect(CITY_MONORAIL_PLAN.maximumSupportSpacing).toBeLessThanOrEqual(12);
    expect(validateCityClearances()).toEqual([]);
    const first = monorailPointAt(0);
    const last = monorailPointAt(1);
    expect(first.distanceTo(last)).toBeLessThan(0.01);
    expect(CITY_MONORAIL_PLAN.stations).toHaveLength(2);
  });

  it('assembles Town Center as an extension of the same neighborhood world and plot graph', () => {
    const world = buildWorld({
      home: 'sage',
      'ch2-neighborhood': 'reveal',
      'city-main-street': 'bakery-row',
    });
    expect(world.cityExpanded).toBe(true);
    expect(world.projectAssets.has('ch2-neighborhood')).toBe(true);
    expect(world.projectAssets.has('city-main-street')).toBe(true);
    const mainStreet = world.projectAssets.get('city-main-street')!.root;
    const mainStreetSite = CITY_SITE_PLAN.projects.find((site) => site.id === 'city-main-street')!;
    expect(mainStreet.position.x).toBeCloseTo(
      CITY_SITE_PLAN.origin[0] + mainStreetSite.position[0],
    );
    expect(mainStreet.position.z).toBeCloseTo(
      CITY_SITE_PLAN.origin[2] + mainStreetSite.position[2],
    );
    expect(world.plotDefinitions[0].nodes.some((node) => node.id === 'town-center-district')).toBe(
      true,
    );
    expect(validatePlot(world.plotDefinitions[0])).toEqual([]);
    world.assets.dispose();

    const base = buildWorld({ home: 'sage', 'ch2-neighborhood': 'reveal' });
    const town = buildWorld({
      home: 'sage',
      'ch2-neighborhood': 'reveal',
      'city-main-street': 'bakery-row',
      'city-plaza': 'square-fountain',
    });
    expect(town.assets.lamps.length - base.assets.lamps.length).toBe(4);
    expect(town.assets.animatedWater).toHaveLength(2);
    expect(town.assets.foliageTimeUniforms.length).toBeGreaterThan(0);
    base.assets.dispose();
    town.assets.dispose();
  });

  it('bounds the continuous city terrain to the neighborhoods and elevated loop', () => {
    const world = buildWorld({
      home: 'sage',
      'ch2-neighborhood': 'reveal',
      'city-main-street': 'bakery-row',
      monorail: 'sage-stone',
    });
    const terrain = world.group.children.find((object) => object instanceof T.Mesh);
    expect(terrain).toBeDefined();
    terrain!.geometry.computeBoundingBox();
    const dimensions = terrain!.geometry.boundingBox!.getSize(new T.Vector3());
    expect(dimensions.x).toBeLessThanOrEqual(230);
    expect(dimensions.z).toBeLessThanOrEqual(150);
    world.assets.dispose();
  });

  it('bounds the camera far enough to reach the outer monorail sites', () => {
    const safe = clampCamera(
      { x: CITY_CAMERA_BOUNDS.maxX + 1, z: CITY_CAMERA_BOUNDS.minZ - 1, zoom: 1, angle: 0 },
      CITY_CAMERA_BOUNDS,
    );
    expect(safe.x).toBe(CITY_CAMERA_BOUNDS.maxX);
    expect(safe.z).toBe(CITY_CAMERA_BOUNDS.minZ);
    expect(CITY_CAMERA_BOUNDS.minX).toBeLessThanOrEqual(-50);
    expect(CITY_CAMERA_BOUNDS.maxX).toBeGreaterThanOrEqual(165);
    expect(CITY_CAMERA_BOUNDS.minZ).toBeLessThanOrEqual(-65);
    expect(CITY_CAMERA_BOUNDS.maxZ).toBeGreaterThanOrEqual(70);
  });
});
