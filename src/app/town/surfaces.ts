import * as T from 'three';
import type { AssetLibrary } from './assets';
type Finish = 'siding' | 'wood' | 'brick' | 'stone' | 'shingles' | 'grass' | 'paving' | 'water';
const noise = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

/** Small original tile maps, generated locally. No downloads or photograph-sized textures. */
export function surface(a: AssetLibrary, finish: Finish, color: string): T.MeshStandardMaterial {
  return a.namedMaterial(`surface:${finish}:${color}`, () => {
    const size = 128,
      pixels = new Uint8Array(size * size * 4),
      bump = new Uint8Array(size * size * 4);
    const base = new T.Color(color).convertLinearToSRGB();
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let shade = 0.94 + noise(x, y) * 0.12,
          height = 0.75;
        if (finish === 'siding') {
          const row = y % 22;
          shade *= row < 2 ? 0.65 : 1 + row * 0.001;
          height = row < 2 ? 0.15 : 0.9;
        }
        if (finish === 'wood') {
          shade *= 0.94 + 0.025 * Math.sin(y * 2.7 + Math.sin(x * 0.09) * 2) + 0.04 * noise(x, y);
          if (y % 16 < 1) shade *= 0.77;
          height = shade * 0.7;
        }
        if (finish === 'brick' || finish === 'stone') {
          const row = Math.floor(y / (finish === 'brick' ? 16 : 32)),
            by = y % (finish === 'brick' ? 16 : 32);
          const bx = (x + (row % 2) * 25) % 50;
          const mortar = bx < 2 || by < 2;
          shade *= mortar
            ? finish === 'brick'
              ? 1.7
              : 0.7
            : 0.82 + noise(Math.floor((x + (row % 2) * 25) / 50), row) * 0.32;
          height = mortar ? 0.1 : 0.8 + noise(x, y) * 0.2;
        }
        if (finish === 'shingles') {
          const row = Math.floor(y / 20),
            edge = y % 20,
            tile = Math.floor((x + (row % 2) * 13) / 26);
          shade *= 0.74 + noise(tile, row) * 0.42;
          if (edge < 2 || (x + (row % 2) * 13) % 26 < 1) shade *= 0.55;
          height = edge < 2 ? 0.1 : 0.9;
        }
        if (finish === 'grass') {
          shade = 0.96 + 0.07 * noise(x, y);
          height = noise(x, y);
        }
        if (finish === 'paving') {
          if (x % 64 < 1 || y % 64 < 1) shade *= 0.76;
          height = shade;
        }
        if (finish === 'water') {
          shade = 0.98 + 0.06 * Math.sin(x * 0.14 + y * 0.09) + 0.04 * Math.cos(y * 0.22);
          height = shade;
        }
        const i = (y * size + x) * 4;
        pixels[i] = Math.min(255, base.r * 255 * shade);
        pixels[i + 1] = Math.min(255, base.g * 255 * shade);
        pixels[i + 2] = Math.min(255, base.b * 255 * shade);
        pixels[i + 3] = 255;
        bump[i] = bump[i + 1] = bump[i + 2] = Math.min(255, height * 255);
        bump[i + 3] = 255;
      }
    const map = new T.DataTexture(pixels, size, size),
      relief = new T.DataTexture(bump, size, size);
    for (const texture of [map, relief]) {
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.generateMipmaps = true;
      texture.minFilter = T.LinearMipmapLinearFilter;
      texture.magFilter = T.LinearFilter;
      texture.anisotropy = 2;
      texture.needsUpdate = true;
      a.texture(texture);
    }
    map.colorSpace = T.SRGBColorSpace;
    const material = new T.MeshStandardMaterial({
      color: '#ffffff',
      map,
      bumpMap: relief,
      bumpScale:
        finish === 'grass' ? 0.004 : finish === 'brick' || finish === 'stone' ? 0.035 : 0.018,
      roughness: finish === 'water' ? 0.24 : 0.91,
      metalness: finish === 'water' ? 0.08 : 0,
    });
    material.userData['uvMeters'] =
      finish === 'grass' ? 0.42 : finish === 'water' ? 0.6 : finish === 'shingles' ? 0.8 : 0.7;
    if (finish === 'shingles') material.userData['uvSpace'] = 'asset';
    return material;
  });
}
