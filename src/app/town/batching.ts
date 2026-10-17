import { BufferAttribute, BufferGeometry, Group, Material, Matrix4, Mesh, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Bake static factory parts into material batches, retaining nested lights and their transforms. */
export function batchStatic(root: Group, own: (geometry: BufferGeometry) => BufferGeometry): void {
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const buckets = new Map<
    string,
    { material: Material; cast: boolean; receive: boolean; parts: BufferGeometry[] }
  >();
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh && !Array.isArray(object.material)) meshes.push(object);
  });
  const scale = new Vector3(),
    matrix = new Matrix4();
  for (const mesh of meshes) {
    const material = mesh.material as Material;
    matrix.multiplyMatrices(inverseRoot, mesh.matrixWorld);
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geometry.applyMatrix4(matrix);
    geometry.clearGroups();
    for (const key of Object.keys(geometry.attributes))
      if (!['position', 'normal', 'uv'].includes(key)) geometry.deleteAttribute(key);
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const position = geometry.getAttribute('position'),
      normal = geometry.getAttribute('normal');
    if (!geometry.getAttribute('uv'))
      geometry.setAttribute('uv', new BufferAttribute(new Float32Array(position.count * 2), 2));
    const uv = geometry.getAttribute('uv'),
      density = material.userData['uvMeters'];
    if (density)
      for (let i = 0; i < position.count; i++) {
        const nx = Math.abs(normal.getX(i)),
          ny = Math.abs(normal.getY(i)),
          nz = Math.abs(normal.getZ(i));
        uv.setXY(
          i,
          (nx > ny && nx > nz ? position.getZ(i) : position.getX(i)) * density,
          (ny > nx && ny > nz ? position.getZ(i) : position.getY(i)) * density,
        );
      }
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox!.getSize(scale);
    scale.multiply(mesh.getWorldScale(new Vector3()));
    const cast =
      mesh.castShadow &&
      !material.transparent &&
      (scale.x * scale.y * scale.z > 0.035 || (scale.y > 0.55 && Math.max(scale.x, scale.z) > 0.2));
    const key = `${material.uuid}/${cast}/${mesh.receiveShadow}`;
    if (!buckets.has(key))
      buckets.set(key, { material, cast, receive: mesh.receiveShadow, parts: [] });
    buckets.get(key)!.parts.push(geometry);
    mesh.removeFromParent();
  }
  for (const bucket of buckets.values()) {
    const geometry = mergeGeometries(bucket.parts, false);
    if (!geometry) throw new Error('Incompatible residential geometry attributes.');
    const mesh = new Mesh(own(geometry), bucket.material);
    mesh.name = 'static-material-batch';
    mesh.castShadow = bucket.cast;
    mesh.receiveShadow = bucket.receive;
    root.add(mesh);
    bucket.parts.forEach((part) => part.dispose());
  }
}
