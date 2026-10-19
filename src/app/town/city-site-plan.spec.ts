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

  it('composes the town around one compact street and a joined civic green', () => {
    expect(CITY_SITE_PLAN.origin[0]).toBe(76);
    expect(CITY_SITE_PLAN.streets.roadSegments.map((segment) => segment.id)).toEqual([
      'main-street',
      'civic-lane',
    ]);
    expect(CITY_SITE_PLAN.shopOffsets).toEqual([-11, 0, 11]);
    const shopSpacing = CITY_SITE_PLAN.shopOffsets
      .slice(1)
      .map((offset, index) => Math.abs(offset - CITY_SITE_PLAN.shopOffsets[index]));
    expect(Math.max(...shopSpacing)).toBeLessThanOrEqual(12);

    const site = (id: string) => CITY_SITE_PLAN.projects.find((candidate) => candidate.id === id)!;
    const plaza = site('city-plaza');
    const greenway = site('city-greenway');
    expect(greenway.position[0]).toBe(plaza.position[0]);
    expect(
      greenway.position[2] - greenway.depth / 2 - (plaza.position[2] + plaza.depth / 2),
    ).toBeCloseTo(1);
    expect(
      Math.abs(site('city-library').position[0] - site('city-main-street').position[0]),
    ).toBeLessThan(24);

    const definition = cityPlotDefinition();
    const connections = definition.connections ?? [];
    const shopOffsets = CITY_SITE_PLAN.shopOffsets;
    expect(
      connections
        .filter((connection) => connection.from.nodeId.startsWith('city-shop-'))
        .every(
          (connection) => connection.maxDistance !== undefined && connection.maxDistance <= 0.25,
        ),
    ).toBe(true);
    for (const [index, offset] of shopOffsets.entries()) {
      const path = CITY_SITE_PLAN.pedestrianPaths.find(
        (candidate) =>
          candidate.id === ['shop-bakery', 'shop-bookshop', 'shop-market'][index] + '-approach',
      )!;
      const entry = resolvePlotPoint(definition, `city-shop-${index + 1}`, [0, 0, 3.42]);
      const pathStart = new T.Vector3(
        CITY_SITE_PLAN.origin[0] + path.from[0],
        0,
        CITY_SITE_PLAN.origin[2] + path.from[1],
      );
      const pathEnd = new T.Vector3(
        CITY_SITE_PLAN.origin[0] + path.to[0],
        0,
        CITY_SITE_PLAN.origin[2] + path.to[1],
      );
      expect(
        entry.distanceTo(pathEnd),
        `shop ${index + 1} path reaches its front door`,
      ).toBeLessThan(0.05);
      expect(pathEnd.x - pathStart.x).toBeGreaterThan(3);
      expect(path.from[1]).toBeCloseTo(6 + offset);
      expect(path.width).toBeGreaterThanOrEqual(1.4);
    }
    expect(
      connections.some(
        (connection) =>
          connection.from.nodeId === 'city-plaza' && connection.to.nodeId === 'city-greenway',
      ),
    ).toBe(true);
  });

  it('keeps the monorail envelope close to the developed city', () => {
    const xs = CITY_MONORAIL_PLAN.points.map(([x]) => x);
    const zs = CITY_MONORAIL_PLAN.points.map(([, z]) => z);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(160);
    expect(Math.max(...zs) - Math.min(...zs)).toBeLessThanOrEqual(92);
    expect(CITY_MONORAIL_PLAN.stations[0].position[0]).toBe(-76);
    expect(CITY_MONORAIL_PLAN.stations[1].position[0]).toBe(84);
  });

  it('batches static station architecture while retaining both station scene anchors', () => {
    const world = buildWorld({
      home: 'sage',
      'ch2-neighborhood': 'reveal',
      'city-main-street': 'bakery-row',
      'city-library': 'garden-library',
      'city-plaza': 'square-fountain',
      'city-greenway': 'pollinator-walk',
      monorail: 'timber-brass',
    });
    const rail = world.projectAssets.get('monorail')!.root;
    const stations = rail.getObjectByName('stations')!;
    const meshes: T.Mesh[] = [];
    stations.traverse((object) => {
      if (object instanceof T.Mesh) meshes.push(object);
    });
    expect(meshes.length).toBeGreaterThan(0);
    expect(rail.getObjectByName('neighborhood-station')).toBeDefined();
    expect(rail.getObjectByName('town-station')).toBeDefined();
    expect(meshes.length).toBeLessThan(40);
    expect(meshes.every((mesh) => mesh.name === 'static-material-batch')).toBe(true);
    world.assets.dispose();
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
    for (const [index, name] of ['bakery', 'bookshop', 'market'].entries()) {
      const storefront = mainStreet.getObjectByName(`storefront-${name}`)!;
      expect(storefront.position.x).toBe(CITY_SITE_PLAN.shopOffsets[index]);
    }
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
      'city-library': 'garden-library',
      'city-plaza': 'square-fountain',
      'city-greenway': 'pollinator-walk',
    });
    const cityTerrain = world.group.children.find((object) => object instanceof T.Mesh);
    expect(cityTerrain).toBeDefined();
    cityTerrain!.geometry.computeBoundingBox();
    const cityDimensions = cityTerrain!.geometry.boundingBox!.getSize(new T.Vector3());
    expect(cityDimensions.x).toBeLessThanOrEqual(175);
    expect(cityDimensions.z).toBeLessThanOrEqual(105);
    world.assets.dispose();

    const expandedWorld = buildWorld({
      home: 'sage',
      'ch2-neighborhood': 'reveal',
      'city-main-street': 'bakery-row',
      monorail: 'sage-stone',
    });
    const terrain = expandedWorld.group.children.find((object) => object instanceof T.Mesh);
    expect(terrain).toBeDefined();
    terrain!.geometry.computeBoundingBox();
    const dimensions = terrain!.geometry.boundingBox!.getSize(new T.Vector3());
    expect(dimensions.x).toBeLessThanOrEqual(205);
    expect(dimensions.z).toBeLessThanOrEqual(125);
    expandedWorld.assets.dispose();
  });

  it('bounds the camera far enough to reach the outer monorail sites', () => {
    const safe = clampCamera(
      { x: CITY_CAMERA_BOUNDS.maxX + 1, z: CITY_CAMERA_BOUNDS.minZ - 1, zoom: 1, angle: 0 },
      CITY_CAMERA_BOUNDS,
    );
    expect(safe.x).toBe(CITY_CAMERA_BOUNDS.maxX);
    expect(safe.z).toBe(CITY_CAMERA_BOUNDS.minZ);
    expect(CITY_CAMERA_BOUNDS.minX).toBeGreaterThanOrEqual(-45);
    expect(CITY_CAMERA_BOUNDS.maxX).toBeLessThan(155);
    expect(CITY_CAMERA_BOUNDS.minZ).toBeGreaterThan(-65);
    expect(CITY_CAMERA_BOUNDS.maxZ).toBeLessThan(65);
  });
});
