// Procedural tile surface textures, generated once on a canvas at load time.
import * as THREE from 'three';

function makeNoise(seed: number) {
  const size = 256;
  const perm = new Uint8Array(size * 2);
  const grad = new Float32Array(size);
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < size; i++) {
    perm[i] = i;
    grad[i] = rand() * 2 - 1;
  }
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < size; i++) perm[i + size] = perm[i];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const val = (x: number, y: number) => grad[perm[(perm[x & 255] + y) & 255]];
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = fade(x - xi);
    const v = fade(y - yi);
    return lerp(lerp(val(xi, yi), val(xi + 1, yi), u), lerp(val(xi, yi + 1), val(xi + 1, yi + 1), u), v);
  };
  return (x: number, y: number, oct = 5) => {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    for (let o = 0; o < oct; o++) {
      sum += noise(x * f, y * f) * amp;
      f *= 2;
      amp *= 0.5;
    }
    return sum;
  };
}

function toTexture(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  return tex;
}

/** Warm white marble with soft grey-taupe veins. */
export function marbleTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const fbm = makeNoise(7);
  const fbm2 = makeNoise(19);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      const turb = fbm(nx * 3, ny * 3, 6);
      // Two vein systems at different angles; sharp where the sine crosses zero.
      const v1 = Math.abs(Math.sin((nx * 1.6 + ny * 2.4) * Math.PI * 2 + turb * 9));
      const v2 = Math.abs(Math.sin((nx * 3.1 - ny * 0.9) * Math.PI * 2 + fbm2(nx * 4, ny * 4, 5) * 7));
      const vein = Math.min(1, Math.pow(1 - v1, 7) * 0.9 + Math.pow(1 - v2, 16) * 0.55 + Math.pow(1 - v1, 2.5) * 0.12);
      const cloud = fbm2(nx * 6, ny * 6, 4) * 0.5 + 0.5;
      const base = 238 + cloud * 10;
      const i = (y * size + x) * 4;
      // Cool grey veins on a warm white ground, like Carrara.
      img.data[i] = base - 4 - vein * 120;
      img.data[i + 1] = base - 5 - vein * 116;
      img.data[i + 2] = base - 8 - vein * 108;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c);
}

/** Soft mottled glaze, tinted by the instance colour in the material. */
export function glazeTexture(strength = 0.06, size = 256, seed = 3) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const fbm = makeNoise(seed);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm((x / size) * 2.5, (y / size) * 2.5, 4);
      const v = Math.round(255 * (1 - strength + n * strength * 2));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c);
}

/**
 * Lets each instance sample a different window of a shared texture, so no two
 * tiles look the same. Expects an instanced `tileUv` attribute: (offsetX, offsetY, rotation).
 */
export function perTileUv(material: THREE.Material, scale: number) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 tileUv;')
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        #ifdef USE_MAP
          float cr = cos(tileUv.z), sr = sin(tileUv.z);
          vMapUv = mat2(cr, -sr, sr, cr) * (vMapUv - 0.5) * ${scale.toFixed(3)} + 0.5 + tileUv.xy;
        #endif`,
      );
  };
}
