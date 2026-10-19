import * as T from 'three';

/** Shared scene units are metres; X is left/right, Y is vertical, and Z is front/back. */
export type PlotVector3 = readonly [number, number, number];
export type PlotRole =
  | 'world'
  | 'district'
  | 'lot'
  | 'structure'
  | 'component'
  | 'zone'
  | 'public-space';

export interface PlotDimensions {
  width: number;
  depth: number;
  height: number;
}

export interface PlotTransform {
  /** Position of this node's local origin in its parent's coordinates. */
  position: PlotVector3;
  /** Euler XYZ rotation in radians. */
  rotation?: PlotVector3;
  /** Optional local point around which rotation is applied. */
  pivot?: PlotVector3;
}

export interface PlotFootprint {
  width: number;
  depth: number;
  offsetX?: number;
  offsetZ?: number;
}

export interface PlotOverlapException {
  nodeId: string;
  reason: string;
}

export interface PlotAnchor {
  id: string;
  type: 'access' | 'frontage' | 'other';
  position: PlotVector3;
  requiresConnection?: boolean;
}

export interface PlotAttachmentPort {
  id: string;
  type: string;
  position: PlotVector3;
  requiresConnection?: boolean;
}

export interface PlotAssemblyPiece {
  id: string;
  order: number;
  dependsOn?: readonly string[];
}

export interface PlotAssembly {
  recipeRef: string;
  pieces: readonly PlotAssemblyPiece[];
  requiredPieceIds: readonly string[];
}

export interface PlotNode {
  id: string;
  role: PlotRole;
  parentId?: string;
  dimensions: PlotDimensions;
  localTransform: PlotTransform;
  /** Centre of the dimensional volume relative to the local origin; useful for asymmetric homes. */
  boundsOffset?: PlotVector3;
  boundaryPolicy?: 'strict' | 'allow-overflow' | 'unbounded';
  boundaryReason?: string;
  occupancy?: 'exclusive' | 'decorative' | 'shared' | 'none';
  footprint?: PlotFootprint;
  /** Explicit, pairwise exceptions for designed attachments such as a porch meeting a wall. */
  overlapExceptions?: readonly PlotOverlapException[];
  anchors?: readonly PlotAnchor[];
  attachmentPorts?: readonly PlotAttachmentPort[];
  assembly?: PlotAssembly;
  /** Optional reference to a production Three.js group; never created per logical node. */
  renderObject?: T.Object3D;
  renderCoordinateSystem?: 'local' | 'legacy-world-authored';
  buildable?: boolean;
  /** Optional future pedestrian capacity metadata; it is never simulated or saved as gameplay. */
  pedestrianCapacity?: number;
  setbacks?: Partial<Record<'north' | 'south' | 'east' | 'west', number>>;
  clearances?: Partial<Record<'north' | 'south' | 'east' | 'west', number>>;
}

export interface PlotEndpoint {
  nodeId: string;
  refId: string;
  kind: 'anchor' | 'port';
}

export interface PlotConnection {
  kind: 'access' | 'attachment';
  from: PlotEndpoint;
  to: PlotEndpoint;
  /** Optional authored maximum gap in metres for a connection that must physically meet. */
  maxDistance?: number;
}

export interface PlotDefinition {
  nodes: readonly PlotNode[];
  connections?: readonly PlotConnection[];
}

export type PlotDiagnosticCode =
  | 'DUPLICATE_ID'
  | 'INVALID_DIMENSIONS'
  | 'MISSING_PARENT'
  | 'PARENT_CYCLE'
  | 'INVALID_TRANSFORM'
  | 'CHILD_OUT_OF_BOUNDS'
  | 'OVERFLOW_REASON_REQUIRED'
  | 'INVALID_FOOTPRINT'
  | 'INVALID_OVERLAP_EXCEPTION'
  | 'OCCUPANCY_COLLISION'
  | 'UNCONNECTED_REQUIRED_ANCHOR'
  | 'UNCONNECTED_REQUIRED_PORT'
  | 'BROKEN_CONNECTION'
  | 'MISSING_ASSEMBLY_PIECE'
  | 'DUPLICATE_ASSEMBLY_ORDER'
  | 'MISSING_ASSEMBLY_DEPENDENCY'
  | 'ASSEMBLY_DEPENDENCY_CYCLE'
  | 'INVALID_SETBACK';

export interface PlotDiagnostic {
  code: PlotDiagnosticCode;
  nodeId?: string;
  relatedNodeId?: string;
  message: string;
}

const EPSILON = 1e-7;

function vector(value: PlotVector3): T.Vector3 {
  return new T.Vector3(value[0], value[1], value[2]);
}

/** Node geometry is centred in X/Z and extends upward from its local ground plane. */
function localMatrix(transform: PlotTransform): T.Matrix4 {
  const position = vector(transform.position);
  const pivot = vector(transform.pivot ?? [0, 0, 0]);
  const rotation = new T.Quaternion().setFromEuler(
    new T.Euler(...(transform.rotation ?? [0, 0, 0]), 'XYZ'),
  );
  return new T.Matrix4()
    .makeTranslation(position.x, position.y, position.z)
    .multiply(new T.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z))
    .multiply(new T.Matrix4().makeRotationFromQuaternion(rotation))
    .multiply(new T.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
}

function finiteVector(value: PlotVector3 | undefined): boolean {
  return !!value && value.length === 3 && value.every(Number.isFinite);
}

function boundsCorners(dimensions: PlotDimensions): T.Vector3[] {
  const halfWidth = dimensions.width / 2;
  const halfDepth = dimensions.depth / 2;
  return [
    new T.Vector3(-halfWidth, 0, -halfDepth),
    new T.Vector3(halfWidth, 0, -halfDepth),
    new T.Vector3(-halfWidth, 0, halfDepth),
    new T.Vector3(halfWidth, 0, halfDepth),
    new T.Vector3(-halfWidth, dimensions.height, -halfDepth),
    new T.Vector3(halfWidth, dimensions.height, -halfDepth),
    new T.Vector3(-halfWidth, dimensions.height, halfDepth),
    new T.Vector3(halfWidth, dimensions.height, halfDepth),
  ];
}

function polygonForFootprint(node: PlotNode): T.Vector3[] | undefined {
  const footprint = node.footprint;
  if (!footprint) return undefined;
  const transform = localMatrix(node.localTransform);
  const west = node.clearances?.west ?? 0;
  const east = node.clearances?.east ?? 0;
  const north = node.clearances?.north ?? 0;
  const south = node.clearances?.south ?? 0;
  const width = footprint.width + west + east;
  const depth = footprint.depth + north + south;
  const offsetX = (footprint.offsetX ?? 0) + (east - west) / 2;
  const offsetZ = (footprint.offsetZ ?? 0) + (south - north) / 2;
  return [
    new T.Vector3(-width / 2, 0, -depth / 2),
    new T.Vector3(width / 2, 0, -depth / 2),
    new T.Vector3(width / 2, 0, depth / 2),
    new T.Vector3(-width / 2, 0, depth / 2),
  ].map((point) => {
    point.x += offsetX;
    point.z += offsetZ;
    return point.applyMatrix4(transform);
  });
}

function overlapsOnAxis(a: T.Vector3[], b: T.Vector3[], axis: T.Vector3): boolean {
  const first = a.map((point) => point.dot(axis));
  const second = b.map((point) => point.dot(axis));
  return Math.min(...first) <= Math.max(...second) + EPSILON &&
    Math.min(...second) <= Math.max(...first) + EPSILON;
}

/** Separating-axis test avoids false collisions for rotated rectangular lot contents. */
function footprintsOverlap(a: T.Vector3[], b: T.Vector3[]): boolean {
  const edges = [...a, ...b];
  for (let index = 0; index < edges.length; index++) {
    const start = edges[index];
    const end = edges[(index + 1) % 4];
    const axis = new T.Vector3(-(end.z - start.z), 0, end.x - start.x).normalize();
    if (!overlapsOnAxis(a, b, axis)) return false;
  }
  return true;
}

function hasNamedException(a: PlotNode, b: PlotNode): boolean {
  const exception = (owner: PlotNode, other: PlotNode) =>
    owner.overlapExceptions?.some(
      (entry) => entry.nodeId === other.id && entry.reason.trim().length > 0,
    );
  return !!exception(a, b) || !!exception(b, a);
}

function endpointKey(endpoint: PlotEndpoint): string {
  return `${endpoint.kind}:${endpoint.nodeId}:${endpoint.refId}`;
}

function anchorFor(node: PlotNode, id: string): PlotAnchor | undefined {
  return node.anchors?.find((anchor) => anchor.id === id);
}

function portFor(node: PlotNode, id: string): PlotAttachmentPort | undefined {
  return node.attachmentPorts?.find((port) => port.id === id);
}

/** Resolve a point from a node's local frame through all parent transforms. */
export function resolvePlotPoint(
  definition: PlotDefinition,
  nodeId: string,
  localPoint: PlotVector3,
): T.Vector3 {
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
  const chain: PlotNode[] = [];
  const visited = new Set<string>();
  let node = nodes.get(nodeId);
  if (!node) throw new Error(`Cannot resolve unknown plot node "${nodeId}".`);
  while (node) {
    if (visited.has(node.id)) throw new Error(`Cannot resolve cyclic plot parent for "${nodeId}".`);
    visited.add(node.id);
    chain.unshift(node);
    node = node.parentId ? nodes.get(node.parentId) : undefined;
  }
  const matrix = new T.Matrix4();
  for (const ancestor of chain) matrix.multiply(localMatrix(ancestor.localTransform));
  return vector(localPoint).applyMatrix4(matrix);
}

/** Resolve a plot node's rectangular ground footprint into world-space X/Z polygon corners. */
export function plotFootprintPolygon(definition: PlotDefinition, nodeId: string): T.Vector3[] {
  const node = definition.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error(`Cannot resolve unknown plot node "${nodeId}".`);
  const footprint = node.footprint;
  const width = footprint?.width ?? node.dimensions.width;
  const depth = footprint?.depth ?? node.dimensions.depth;
  const offsetX = footprint?.offsetX ?? 0;
  const offsetZ = footprint?.offsetZ ?? 0;
  const corners: PlotVector3[] = [
    [offsetX - width / 2, 0, offsetZ - depth / 2],
    [offsetX + width / 2, 0, offsetZ - depth / 2],
    [offsetX + width / 2, 0, offsetZ + depth / 2],
    [offsetX - width / 2, 0, offsetZ + depth / 2],
  ];
  return corners.map((point) => resolvePlotPoint(definition, nodeId, point));
}

function cross2D(a: T.Vector3, b: T.Vector3, c: T.Vector3): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function pointOnSegment2D(a: T.Vector3, b: T.Vector3, point: T.Vector3): boolean {
  return (
    Math.abs(cross2D(a, b, point)) <= EPSILON &&
    point.x >= Math.min(a.x, b.x) - EPSILON &&
    point.x <= Math.max(a.x, b.x) + EPSILON &&
    point.z >= Math.min(a.z, b.z) - EPSILON &&
    point.z <= Math.max(a.z, b.z) + EPSILON
  );
}

function segmentsIntersect2D(a: T.Vector3, b: T.Vector3, c: T.Vector3, d: T.Vector3): boolean {
  const abC = cross2D(a, b, c);
  const abD = cross2D(a, b, d);
  const cdA = cross2D(c, d, a);
  const cdB = cross2D(c, d, b);
  return (
    (abC > EPSILON && abD < -EPSILON && cdA > EPSILON && cdB < -EPSILON) ||
    (abC < -EPSILON && abD > EPSILON && cdA < -EPSILON && cdB > EPSILON) ||
    (Math.abs(abC) <= EPSILON && pointOnSegment2D(a, b, c)) ||
    (Math.abs(abD) <= EPSILON && pointOnSegment2D(a, b, d)) ||
    (Math.abs(cdA) <= EPSILON && pointOnSegment2D(c, d, a)) ||
    (Math.abs(cdB) <= EPSILON && pointOnSegment2D(c, d, b))
  );
}

function pointInPolygon2D(polygon: readonly T.Vector3[], point: T.Vector3): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[previous];
    const b = polygon[index];
    if (pointOnSegment2D(a, b, point)) return true;
    const crosses = (a.z > point.z) !== (b.z > point.z);
    if (crosses && point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x)
      inside = !inside;
  }
  return inside;
}

function pointToSegmentDistance2D(point: T.Vector3, start: T.Vector3, end: T.Vector3): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const projection =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
  return Math.hypot(point.x - start.x - projection * dx, point.z - start.z - projection * dz);
}

/** Minimum edge clearance between two ground polygons; overlapping polygons return zero. */
export function plotPolygonClearance(first: readonly T.Vector3[], second: readonly T.Vector3[]): number {
  if (first.length < 3 || second.length < 3)
    throw new Error('Plot clearance needs two polygons with at least three corners each.');
  if (pointInPolygon2D(first, second[0]) || pointInPolygon2D(second, first[0])) return 0;

  let clearance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < first.length; index++) {
    const a = first[index];
    const b = first[(index + 1) % first.length];
    for (let other = 0; other < second.length; other++) {
      const c = second[other];
      const d = second[(other + 1) % second.length];
      if (segmentsIntersect2D(a, b, c, d)) return 0;
      clearance = Math.min(
        clearance,
        pointToSegmentDistance2D(a, c, d),
        pointToSegmentDistance2D(b, c, d),
        pointToSegmentDistance2D(c, a, b),
        pointToSegmentDistance2D(d, a, b),
      );
    }
  }
  return clearance;
}

/** Structural validation for authored plot contracts; this is not arbitrary mesh collision detection. */
export function validatePlot(definition: PlotDefinition): PlotDiagnostic[] {
  const issues: PlotDiagnostic[] = [];
  const add = (
    code: PlotDiagnosticCode,
    nodeId: string | undefined,
    message: string,
    relatedNodeId?: string,
  ) => issues.push({ code, nodeId, relatedNodeId, message });
  const nodes = new Map<string, PlotNode>();

  for (const node of definition.nodes) {
    if (nodes.has(node.id))
      add('DUPLICATE_ID', node.id, `Plot node ID "${node.id}" is duplicated.`);
    else nodes.set(node.id, node);
    const { width, depth, height } = node.dimensions;
    if (![width, depth, height].every((value) => Number.isFinite(value) && value > 0))
      add('INVALID_DIMENSIONS', node.id, `Node "${node.id}" needs positive finite dimensions.`);
    const transform = node.localTransform;
    if (
      !finiteVector(transform.position) ||
      !finiteVector(transform.rotation ?? [0, 0, 0]) ||
      !finiteVector(transform.pivot ?? [0, 0, 0]) ||
      (node.boundsOffset !== undefined && !finiteVector(node.boundsOffset)) ||
      (node.anchors ?? []).some((anchor) => !finiteVector(anchor.position)) ||
      (node.attachmentPorts ?? []).some((port) => !finiteVector(port.position))
    )
      add('INVALID_TRANSFORM', node.id, `Node "${node.id}" has a non-finite transform.`);
    if (node.parentId && !definition.nodes.some((candidate) => candidate.id === node.parentId))
      add('MISSING_PARENT', node.id, `Parent "${node.parentId}" for "${node.id}" does not exist.`);
    if (node.boundaryPolicy === 'allow-overflow' && !node.boundaryReason?.trim())
      add('OVERFLOW_REASON_REQUIRED', node.id, `Node "${node.id}" must explain its boundary overflow.`);
    if (node.footprint && ![node.footprint.width, node.footprint.depth].every((v) => Number.isFinite(v) && v > 0))
      add('INVALID_FOOTPRINT', node.id, `Node "${node.id}" has an invalid occupancy footprint.`);
    if (
      node.pedestrianCapacity !== undefined &&
      (!Number.isInteger(node.pedestrianCapacity) || node.pedestrianCapacity < 0)
    )
      add('INVALID_DIMENSIONS', node.id, `Node "${node.id}" has invalid pedestrian capacity metadata.`);
    for (const exception of node.overlapExceptions ?? []) {
      if (!exception.nodeId || !exception.reason.trim())
        add('INVALID_OVERLAP_EXCEPTION', node.id, `Node "${node.id}" has an overlap exception without a target and reason.`);
    }
    for (const [side, setback] of Object.entries({ ...node.setbacks, ...node.clearances })) {
      if (setback !== undefined && (!Number.isFinite(setback) || setback < 0))
        add('INVALID_SETBACK', node.id, `Node "${node.id}" has an invalid ${side} setback or clearance.`);
    }
  }

  const visitState = new Map<string, 'visiting' | 'visited'>();
  const visitParent = (node: PlotNode) => {
    const state = visitState.get(node.id);
    if (state === 'visiting') {
      add('PARENT_CYCLE', node.id, `Parent hierarchy contains a cycle at "${node.id}".`);
      return;
    }
    if (state === 'visited') return;
    visitState.set(node.id, 'visiting');
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) visitParent(parent);
    visitState.set(node.id, 'visited');
  };
  for (const node of definition.nodes) visitParent(node);

  for (const node of definition.nodes) {
    if (!node.parentId || node.boundaryPolicy === 'allow-overflow' || node.boundaryPolicy === 'unbounded') continue;
    const parent = nodes.get(node.parentId);
    if (!parent) continue;
    const matrix = localMatrix(node.localTransform);
    const offset = vector(node.boundsOffset ?? [0, 0, 0]);
    const corners = boundsCorners(node.dimensions).map((point) =>
      point.add(offset).applyMatrix4(matrix),
    );
    const halfWidth = parent.dimensions.width / 2;
    const halfDepth = parent.dimensions.depth / 2;
    if (
      corners.some(
        (point) =>
          point.x < -halfWidth - EPSILON ||
          point.x > halfWidth + EPSILON ||
          point.z < -halfDepth - EPSILON ||
          point.z > halfDepth + EPSILON ||
          point.y < -EPSILON ||
          point.y > parent.dimensions.height + EPSILON,
      )
    )
      add('CHILD_OUT_OF_BOUNDS', node.id, `Node "${node.id}" extends beyond parent "${parent.id}".`, parent.id);
    if (node.occupancy === 'exclusive' && node.footprint && parent.setbacks) {
      const bounds = node.footprint;
      const localEdges = {
        west: (bounds.offsetX ?? 0) - bounds.width / 2,
        east: (bounds.offsetX ?? 0) + bounds.width / 2,
        north: (bounds.offsetZ ?? 0) - bounds.depth / 2,
        south: (bounds.offsetZ ?? 0) + bounds.depth / 2,
      };
      const minimums = {
        west: -parent.dimensions.width / 2 + (parent.setbacks.west ?? 0),
        east: parent.dimensions.width / 2 - (parent.setbacks.east ?? 0),
        north: -parent.dimensions.depth / 2 + (parent.setbacks.north ?? 0),
        south: parent.dimensions.depth / 2 - (parent.setbacks.south ?? 0),
      };
      if (
        localEdges.west < minimums.west - EPSILON ||
        localEdges.east > minimums.east + EPSILON ||
        localEdges.north < minimums.north - EPSILON ||
        localEdges.south > minimums.south + EPSILON
      )
        add('CHILD_OUT_OF_BOUNDS', node.id, `Node "${node.id}" violates a parent property setback.`, parent.id);
    }
  }

  const siblings = new Map<string, PlotNode[]>();
  for (const node of definition.nodes) {
    if (!node.parentId || node.occupancy !== 'exclusive' || !node.footprint) continue;
    const group = siblings.get(node.parentId) ?? [];
    group.push(node);
    siblings.set(node.parentId, group);
  }
  for (const group of siblings.values()) {
    for (let index = 0; index < group.length; index++) {
      const first = group[index];
      const firstPolygon = polygonForFootprint(first);
      if (!firstPolygon) continue;
      for (let other = index + 1; other < group.length; other++) {
        const second = group[other];
        if (hasNamedException(first, second)) continue;
        const secondPolygon = polygonForFootprint(second);
        if (secondPolygon && footprintsOverlap(firstPolygon, secondPolygon))
          add('OCCUPANCY_COLLISION', first.id, `Exclusive footprints "${first.id}" and "${second.id}" overlap.`, second.id);
      }
    }
  }

  const connectedRefs = new Set<string>();
  for (const connection of definition.connections ?? []) {
    const validEndpoint = (endpoint: PlotEndpoint) => {
      const node = nodes.get(endpoint.nodeId);
      if (!node) return false;
      return endpoint.kind === 'anchor'
        ? !!anchorFor(node, endpoint.refId)
        : !!portFor(node, endpoint.refId);
    };
    const expectedKind = connection.kind === 'access' ? 'anchor' : 'port';
    const fromValid = validEndpoint(connection.from) && connection.from.kind === expectedKind;
    const toValid = validEndpoint(connection.to) && connection.to.kind === expectedKind;
    if (!fromValid || !toValid) {
      add('BROKEN_CONNECTION', connection.from.nodeId, `Connection "${endpointKey(connection.from)}" to "${endpointKey(connection.to)}" has a missing or incompatible endpoint.`, connection.to.nodeId);
      continue;
    }
    const fromNode = nodes.get(connection.from.nodeId)!;
    const toNode = nodes.get(connection.to.nodeId)!;
    if (connection.kind === 'access') {
      const fromAnchor = anchorFor(fromNode, connection.from.refId)!;
      const toAnchor = anchorFor(toNode, connection.to.refId)!;
      if (fromAnchor.type !== 'access' || toAnchor.type !== 'access') {
        add('BROKEN_CONNECTION', connection.from.nodeId, 'Access links must join access anchors.', connection.to.nodeId);
        continue;
      }
    } else if (
      portFor(fromNode, connection.from.refId)!.type !== portFor(toNode, connection.to.refId)!.type
    ) {
      add('BROKEN_CONNECTION', connection.from.nodeId, 'Attachment ports must use the same port type.', connection.to.nodeId);
      continue;
    }
    if (connection.maxDistance !== undefined) {
      if (!Number.isFinite(connection.maxDistance) || connection.maxDistance < 0) {
        add('BROKEN_CONNECTION', connection.from.nodeId, 'Connection maximum distance must be finite and nonnegative.', connection.to.nodeId);
        continue;
      }
      const pointFor = (endpoint: PlotEndpoint) => {
        const owner = nodes.get(endpoint.nodeId)!;
        const point = endpoint.kind === 'anchor'
          ? anchorFor(owner, endpoint.refId)!.position
          : portFor(owner, endpoint.refId)!.position;
        return resolvePlotPoint(definition, endpoint.nodeId, point);
      };
      if (pointFor(connection.from).distanceTo(pointFor(connection.to)) > connection.maxDistance + EPSILON) {
        add('BROKEN_CONNECTION', connection.from.nodeId, 'Connected anchors exceed their authored maximum gap.', connection.to.nodeId);
        continue;
      }
    }
    connectedRefs.add(endpointKey(connection.from));
    connectedRefs.add(endpointKey(connection.to));
  }

  for (const node of definition.nodes) {
    for (const anchor of node.anchors ?? []) {
      if (anchor.requiresConnection && !connectedRefs.has(endpointKey({ nodeId: node.id, refId: anchor.id, kind: 'anchor' })))
        add('UNCONNECTED_REQUIRED_ANCHOR', node.id, `Required access anchor "${anchor.id}" is not connected.`);
    }
    for (const port of node.attachmentPorts ?? []) {
      if (port.requiresConnection && !connectedRefs.has(endpointKey({ nodeId: node.id, refId: port.id, kind: 'port' })))
        add('UNCONNECTED_REQUIRED_PORT', node.id, `Required attachment port "${port.id}" is not connected.`);
    }
    if (!node.assembly) continue;
    const pieces = new Map<string, PlotAssemblyPiece>();
    const orders = new Set<number>();
    for (const piece of node.assembly.pieces) {
      if (pieces.has(piece.id)) add('MISSING_ASSEMBLY_PIECE', node.id, `Assembly piece ID "${piece.id}" is duplicated.`);
      pieces.set(piece.id, piece);
      if (!Number.isInteger(piece.order) || piece.order < 0) add('DUPLICATE_ASSEMBLY_ORDER', node.id, `Assembly piece "${piece.id}" needs a nonnegative integer order.`);
      else if (orders.has(piece.order)) add('DUPLICATE_ASSEMBLY_ORDER', node.id, `Assembly order ${piece.order} is duplicated.`);
      orders.add(piece.order);
    }
    for (const required of node.assembly.requiredPieceIds) {
      if (!pieces.has(required)) add('MISSING_ASSEMBLY_PIECE', node.id, `Required assembly piece "${required}" is missing.`);
    }
    const assemblyState = new Map<string, 'visiting' | 'visited'>();
    const visitPiece = (id: string) => {
      if (assemblyState.get(id) === 'visiting') {
        add('ASSEMBLY_DEPENDENCY_CYCLE', node.id, `Assembly dependencies contain a cycle at "${id}".`);
        return;
      }
      if (assemblyState.get(id) === 'visited') return;
      assemblyState.set(id, 'visiting');
      for (const dependency of pieces.get(id)?.dependsOn ?? []) {
        const prerequisite = pieces.get(dependency);
        if (!prerequisite) {
          add('MISSING_ASSEMBLY_DEPENDENCY', node.id, `Assembly piece "${id}" depends on missing piece "${dependency}".`);
        } else visitPiece(dependency);
      }
      assemblyState.set(id, 'visited');
    };
    for (const piece of node.assembly.pieces) visitPiece(piece.id);
  }

  return issues;
}

export interface PlotSceneHierarchy {
  /** Synthetic render hierarchy. Production world batching should continue using the existing roots. */
  group: T.Group;
  nodes: ReadonlyMap<string, T.Group>;
}

/**
 * Build a lightweight synthetic adapter for authored render groups. Only nodes that bind content
 * and the ancestors needed to place that content receive Object3Ds; ordinary definition-only nodes
 * remain plain data. Adapters are cloned so the source world is never reparented or transformed.
 */
export function createPlotSceneHierarchy(
  definition: PlotDefinition,
  adapters: ReadonlyMap<string, T.Object3D>,
): PlotSceneHierarchy {
  const byId = new Map(definition.nodes.map((node) => [node.id, node]));
  const included = new Set<string>();
  for (const adapterId of adapters.keys()) {
    let node = byId.get(adapterId);
    if (!node) throw new Error(`Cannot bind unknown plot node "${adapterId}".`);
    const chain = new Set<string>();
    while (node) {
      if (chain.has(node.id)) throw new Error(`Cannot bind through cyclic plot node "${node.id}".`);
      chain.add(node.id);
      included.add(node.id);
      node = node.parentId ? byId.get(node.parentId) : undefined;
    }
  }

  const group = new T.Group();
  group.name = 'synthetic-plot-scene';
  const nodes = new Map<string, T.Group>();
  for (const definitionNode of definition.nodes) {
    if (!included.has(definitionNode.id)) continue;
    const plotGroup = new T.Group();
    plotGroup.name = `plot:${definitionNode.id}`;
    plotGroup.userData['plotNodeId'] = definitionNode.id;
    localMatrix(definitionNode.localTransform).decompose(
      plotGroup.position,
      plotGroup.quaternion,
      plotGroup.scale,
    );
    const parent = definitionNode.parentId ? nodes.get(definitionNode.parentId) : undefined;
    (parent ?? group).add(plotGroup);
    nodes.set(definitionNode.id, plotGroup);
  }
  group.updateMatrixWorld(true);
  for (const [nodeId, adapter] of adapters) {
    const node = byId.get(nodeId)!;
    const plotGroup = nodes.get(nodeId)!;
    const clone = adapter.clone(true);
    if (node.renderCoordinateSystem === 'legacy-world-authored') {
      adapter.updateWorldMatrix(true, false);
      const adapterLocal = plotGroup.matrixWorld.clone().invert().multiply(adapter.matrixWorld);
      adapterLocal.decompose(clone.position, clone.quaternion, clone.scale);
    }
    plotGroup.add(clone);
  }
  group.updateMatrixWorld(true);
  return { group, nodes };
}
