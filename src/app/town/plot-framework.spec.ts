import { describe, expect, it } from 'vitest';
import * as T from 'three';
import {
  createPlotSceneHierarchy,
  plotFootprintPolygon,
  plotPolygonClearance,
  resolvePlotPoint,
  validatePlot,
  type PlotDefinition,
  type PlotNode,
} from './plot-framework';

function node(id: string, overrides: Partial<PlotNode> = {}): PlotNode {
  return {
    id,
    role: 'lot',
    dimensions: { width: 10, depth: 10, height: 8 },
    localTransform: { position: [0, 0, 0] },
    ...overrides,
  };
}

function plot(nodes: PlotNode[], connections: PlotDefinition['connections'] = []): PlotDefinition {
  return { nodes, connections };
}

function axisBounds(points: readonly T.Vector3[]) {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minZ: Math.min(...points.map((point) => point.z)),
    maxZ: Math.max(...points.map((point) => point.z)),
  };
}

describe('universal plot definitions', () => {
  it('measures rotated footprint clearance from the actual parcel edges', () => {
    const definition = plot([
      node('first', {
        dimensions: { width: 4, depth: 0.5, height: 1 },
        footprint: { width: 4, depth: 0.5 },
        localTransform: { position: [0, 0, 0], rotation: [0, Math.PI / 4, 0] },
      }),
      node('second', {
        dimensions: { width: 4, depth: 0.5, height: 1 },
        footprint: { width: 4, depth: 0.5 },
        localTransform: { position: [2.6, 0, 2.6], rotation: [0, Math.PI / 4, 0] },
      }),
    ]);
    const first = plotFootprintPolygon(definition, 'first');
    const second = plotFootprintPolygon(definition, 'second');
    const firstBounds = axisBounds(first);
    const secondBounds = axisBounds(second);
    const aabbsOverlap =
      firstBounds.minX < secondBounds.maxX &&
      firstBounds.maxX > secondBounds.minX &&
      firstBounds.minZ < secondBounds.maxZ &&
      firstBounds.maxZ > secondBounds.minZ;

    expect(aabbsOverlap).toBe(true);
    expect(plotPolygonClearance(first, second)).toBeCloseTo(3.18, 1);

    const overlapping = plot([
      definition.nodes[0],
      {
        ...definition.nodes[1],
        localTransform: { position: [0.2, 0, 0.2], rotation: [0, Math.PI / 4, 0] },
      },
    ]);
    expect(
      plotPolygonClearance(
        plotFootprintPolygon(overlapping, 'first'),
        plotFootprintPolygon(overlapping, 'second'),
      ),
    ).toBe(0);
  });
  it('resolves nested translations and rotations around arbitrary local pivots', () => {
    const definition = plot([
      node('district', {
        role: 'district',
        dimensions: { width: 100, depth: 100, height: 30 },
        localTransform: { position: [10, 0, 0], rotation: [0, Math.PI / 2, 0], pivot: [1, 0, 0] },
      }),
      node('lot', {
        parentId: 'district',
        dimensions: { width: 20, depth: 20, height: 10 },
        localTransform: { position: [2, 0, 0] },
      }),
      node('house', {
        parentId: 'lot',
        role: 'structure',
        dimensions: { width: 8, depth: 6, height: 5 },
        localTransform: {
          position: [2, 0, 0],
          rotation: [0, Math.PI / 2, 0],
          pivot: [0.5, 0, 0],
        },
      }),
    ]);

    expect(resolvePlotPoint(definition, 'house', [0.5, 0, 0]).toArray()).toEqual([11, 0, -3.5]);
    expect(validatePlot(definition)).toEqual([]);
  });

  it('moves and rotates adapted child groups with a plot parent in a synthetic scene', () => {
    const definition = plot([
      node('property', {
        role: 'lot',
        dimensions: { width: 30, depth: 30, height: 12 },
        localTransform: { position: [4, 0, 3] },
      }),
      node('house', {
        parentId: 'property',
        role: 'structure',
        dimensions: { width: 8, depth: 6, height: 5 },
        localTransform: { position: [2, 0.13, -1] },
      }),
      node('garden', {
        parentId: 'property',
        role: 'zone',
        dimensions: { width: 5, depth: 2, height: 1 },
        localTransform: { position: [-3, 0, 4] },
      }),
    ]);
    const sourceHouse = new T.Group();
    sourceHouse.position.x = 0.5;
    const sourceGarden = new T.Group();
    sourceGarden.position.z = 1;
    const hierarchy = createPlotSceneHierarchy(
      definition,
      new Map([
        ['house', sourceHouse],
        ['garden', sourceGarden],
      ]),
    );
    const property = hierarchy.nodes.get('property')!;
    hierarchy.group.updateMatrixWorld(true);
    const houseBefore = new T.Vector3();
    hierarchy.nodes.get('house')!.getWorldPosition(houseBefore);
    expect(houseBefore.toArray()).toEqual([6, 0.13, 2]);
    expect(property.children).toHaveLength(2);
    expect(hierarchy.nodes.size).toBe(3);

    property.position.x += 5;
    property.rotation.y = Math.PI / 2;
    hierarchy.group.updateMatrixWorld(true);
    const houseAfter = new T.Vector3();
    const gardenAfter = new T.Vector3();
    hierarchy.nodes.get('house')!.getWorldPosition(houseAfter);
    hierarchy.nodes.get('garden')!.getWorldPosition(gardenAfter);
    expect(houseAfter.x).toBeCloseTo(8);
    expect(houseAfter.z).toBeCloseTo(1);
    expect(gardenAfter.x).toBeCloseTo(13);
    expect(gardenAfter.z).toBeCloseTo(6);
    expect(sourceHouse.position.toArray()).toEqual([0.5, 0, 0]);
    expect(sourceGarden.position.toArray()).toEqual([0, 0, 1]);
  });

  it('normalizes a legacy world-authored adapter so plot placement is not applied twice', () => {
    const definition = plot([
      node('property', {
        dimensions: { width: 50, depth: 50, height: 15 },
        localTransform: { position: [10, 0, 3] },
      }),
      node('legacy-house', {
        parentId: 'property',
        role: 'structure',
        dimensions: { width: 8, depth: 6, height: 5 },
        localTransform: { position: [2, 0, -1] },
        renderCoordinateSystem: 'legacy-world-authored',
      }),
    ]);
    const existingWorldHouse = new T.Group();
    existingWorldHouse.position.set(12, 0, 2);
    const hierarchy = createPlotSceneHierarchy(
      definition,
      new Map([['legacy-house', existingWorldHouse]]),
    );
    const house = hierarchy.nodes.get('legacy-house')!.children[0];
    hierarchy.group.updateMatrixWorld(true);
    const before = new T.Vector3();
    house.getWorldPosition(before);
    expect(before.toArray()).toEqual([12, 0, 2]);

    hierarchy.nodes.get('property')!.position.x += 5;
    hierarchy.group.updateMatrixWorld(true);
    const after = new T.Vector3();
    house.getWorldPosition(after);
    expect(after.toArray()).toEqual([17, 0, 2]);
    expect(existingWorldHouse.parent).toBeNull();
  });

  it('reports duplicate IDs, invalid dimensions, missing parents and parent cycles', () => {
    const diagnostics = validatePlot(
      plot([
        node('duplicate'),
        node('duplicate'),
        node('bad-size', { dimensions: { width: 0, depth: Number.NaN, height: 1 } }),
        node('orphan', { parentId: 'missing' }),
        node('cycle-a', { parentId: 'cycle-b' }),
        node('cycle-b', { parentId: 'cycle-a' }),
      ]),
    );

    expect(diagnostics.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'DUPLICATE_ID',
        'INVALID_DIMENSIONS',
        'MISSING_PARENT',
        'PARENT_CYCLE',
      ]),
    );
  });

  it('reports non-finite transforms and rejects overflow without an explicit reason', () => {
    const diagnostics = validatePlot(
      plot([
        node('lot'),
        node('invalid', {
          parentId: 'lot',
          localTransform: { position: [Number.POSITIVE_INFINITY, 0, 0] },
        }),
        node('overflow', {
          parentId: 'lot',
          dimensions: { width: 4, depth: 4, height: 1 },
          localTransform: { position: [4, 0, 0] },
        }),
      ]),
    );

    expect(diagnostics.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['INVALID_TRANSFORM', 'CHILD_OUT_OF_BOUNDS']),
    );
  });

  it('permits a documented access route to cross its property boundary', () => {
    const diagnostics = validatePlot(
      plot([
        node('lot', { dimensions: { width: 10, depth: 10, height: 8 } }),
        node('driveway', {
          parentId: 'lot',
          role: 'zone',
          dimensions: { width: 3, depth: 12, height: 0.2 },
          localTransform: { position: [0, 0, 0] },
          boundaryPolicy: 'allow-overflow',
          boundaryReason: 'The driveway joins the public sidewalk at the frontage.',
        }),
      ]),
    );

    expect(diagnostics).toEqual([]);
  });

  it('detects occupied sibling overlap but accepts a named architectural exception', () => {
    const shared = (overlapExceptions?: PlotNode['overlapExceptions']) =>
      plot([
        node('lot'),
        node('house', {
          parentId: 'lot',
          role: 'structure',
          occupancy: 'exclusive',
          footprint: { width: 6, depth: 6 },
        }),
        node('porch', {
          parentId: 'lot',
          role: 'component',
          occupancy: 'exclusive',
          footprint: { width: 4, depth: 3, offsetX: 0, offsetZ: 2 },
          overlapExceptions,
        }),
      ]);

    expect(validatePlot(shared()).map((issue) => issue.code)).toContain('OCCUPANCY_COLLISION');
    expect(
      validatePlot(
        shared([{ nodeId: 'house', reason: 'The porch roof and wall intentionally meet.' }]),
      ),
    ).toEqual([]);
  });

  it('applies directional clearances to exclusive occupancy footprints', () => {
    const definition = plot([
      node('lot'),
      node('shed', {
        parentId: 'lot',
        occupancy: 'exclusive',
        footprint: { width: 2, depth: 2, offsetX: -1.2 },
        clearances: { east: 1.1 },
      }),
      node('patio', {
        parentId: 'lot',
        occupancy: 'exclusive',
        footprint: { width: 1, depth: 1, offsetX: 1.3 },
      }),
    ]);

    expect(validatePlot(definition).map((issue) => issue.code)).toContain('OCCUPANCY_COLLISION');
  });

  it('keeps decorative landscaping out of structural collision checks', () => {
    const definition = plot([
      node('lot'),
      node('house', {
        parentId: 'lot',
        occupancy: 'exclusive',
        footprint: { width: 6, depth: 6 },
      }),
      node('flower-bed', {
        parentId: 'lot',
        role: 'component',
        occupancy: 'decorative',
        footprint: { width: 4, depth: 2 },
      }),
    ]);

    expect(validatePlot(definition)).toEqual([]);
  });

  it('checks required access anchors and valid anchor-to-anchor connections', () => {
    const nodes = [
      node('lot', {
        anchors: [
          { id: 'frontage', type: 'access', position: [0, 0, 5], requiresConnection: true },
        ],
      }),
      node('road', {
        role: 'public-space',
        anchors: [{ id: 'walkway', type: 'access', position: [0, 0, -1] }],
      }),
    ];
    const disconnected = validatePlot(plot(nodes));
    const connected = validatePlot(
      plot(nodes, [
        {
          kind: 'access',
          from: { nodeId: 'lot', refId: 'frontage', kind: 'anchor' },
          to: { nodeId: 'road', refId: 'walkway', kind: 'anchor' },
        },
      ]),
    );

    expect(disconnected.map((issue) => issue.code)).toContain('UNCONNECTED_REQUIRED_ANCHOR');
    expect(connected).toEqual([]);
    expect(
      validatePlot(
        plot(nodes, [
          {
            kind: 'access',
            from: { nodeId: 'lot', refId: 'missing', kind: 'anchor' },
            to: { nodeId: 'road', refId: 'walkway', kind: 'anchor' },
          },
        ]),
      ).map((issue) => issue.code),
    ).toContain('BROKEN_CONNECTION');
  });

  it('checks authored maximum gaps on required access connections', () => {
    const diagnostics = validatePlot(
      plot(
        [
          node('house', {
            anchors: [
              { id: 'door', type: 'access', position: [0, 0, 0], requiresConnection: true },
            ],
          }),
          node('walk', {
            anchors: [{ id: 'entry', type: 'access', position: [2, 0, 0] }],
          }),
        ],
        [
          {
            kind: 'access',
            from: { nodeId: 'house', refId: 'door', kind: 'anchor' },
            to: { nodeId: 'walk', refId: 'entry', kind: 'anchor' },
            maxDistance: 0.2,
          },
        ],
      ),
    );

    expect(diagnostics.map((issue) => issue.code)).toContain('BROKEN_CONNECTION');
    expect(diagnostics.map((issue) => issue.code)).toContain('UNCONNECTED_REQUIRED_ANCHOR');
  });

  it('validates attachment ports independently from pedestrian access anchors', () => {
    const diagnostics = validatePlot(
      plot(
        [
          node('house', {
            anchors: [{ id: 'entry', type: 'access', position: [0, 0, 2] }],
            attachmentPorts: [
              { id: 'front-wall', type: 'wall', position: [0, 1, 2], requiresConnection: true },
            ],
          }),
          node('porch', {
            attachmentPorts: [{ id: 'back-edge', type: 'wall', position: [0, 1, -1] }],
          }),
        ],
        [
          {
            kind: 'attachment',
            from: { nodeId: 'house', refId: 'front-wall', kind: 'port' },
            to: { nodeId: 'porch', refId: 'back-edge', kind: 'port' },
          },
        ],
      ),
    );

    expect(diagnostics).toEqual([]);
  });

  it('reports missing required assembly pieces and invalid ordering dependencies', () => {
    const diagnostics = validatePlot(
      plot([
        node('house', {
          assembly: {
            recipeRef: 'starting-home:cottage',
            pieces: [
              { id: 'walls', order: 2, dependsOn: ['roof'] },
              { id: 'roof', order: 2, dependsOn: ['missing-piece'] },
            ],
            requiredPieceIds: ['foundation', 'walls'],
          },
        }),
      ]),
    );

    expect(diagnostics.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'MISSING_ASSEMBLY_PIECE',
        'DUPLICATE_ASSEMBLY_ORDER',
        'MISSING_ASSEMBLY_DEPENDENCY',
      ]),
    );
  });
});
