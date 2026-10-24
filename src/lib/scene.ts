// Scroll-driven 3D tiling room for the home page.
// Tiles start scattered in the air and lay themselves into a floor and two walls
// as the visitor scrolls, while the camera moves through a daylit bathroom.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { glazeTexture, marbleTexture, perTileUv, rippleNormalTexture, streakGlazeTexture } from './textures';

type Placement = { pos: THREE.Vector3; quat: THREE.Quaternion };
export type FloorStyle = 'marble' | 'sage' | 'terracotta' | 'charcoal';

interface TileGroup {
  mesh: THREE.InstancedMesh;
  target: Placement[];
  start: Placement[];
  delay: number[];
  phase: number[];
  range: [number, number];
  float: boolean;
}

const ROOM = { halfW: 5, back: -4, front: 4, height: 5 };
const BG = new THREE.Color('#f6f1e9');
// Low golden-hour sun so light streaks run long across the floor and up the walls.
const SUN_DIR = new THREE.Vector3(7, 4.6, 4.2).normalize();

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const quatY = (rad: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rad);

function herringbone(u: number) {
  const out: { x: number; z: number; rot: number }[] = [];
  const c = Math.SQRT1_2;
  const span = Math.ceil(14 / u);
  for (let k = -span; k <= span; k++) {
    for (let m = -span; m <= span; m++) {
      const x = (k + 4 * m) * u;
      // Horizontal brick (2u × u) and vertical brick (u × 2u) in pattern space.
      const bricks = [
        { px: x + u, py: k * u + u / 2, rot: 0 },
        { px: x + u / 2, py: (k + 1) * u + u, rot: Math.PI / 2 },
      ];
      for (const b of bricks) {
        // Rotate the whole layout 45° for a classic herringbone floor.
        const wx = (b.px - b.py) * c;
        const wz = (b.px + b.py) * c;
        if (Math.abs(wx) < ROOM.halfW - u * 0.4 && wz > ROOM.back + u * 0.4 && wz < ROOM.front) {
          out.push({ x: wx, z: wz, rot: -(b.rot + Math.PI / 4) });
        }
      }
    }
  }
  return out;
}

function makeGroup(opts: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  colors: string[];
  targets: Placement[];
  startFor: (t: Placement, r: () => number) => Placement;
  delayFor: (t: Placement) => number;
  range: [number, number];
  float?: boolean;
  seed: number;
  shadows: boolean;
}): TileGroup {
  const { geometry, material, colors, targets, startFor, delayFor, range, seed, shadows } = opts;
  const r = rng(seed);
  const n = targets.length;

  // Per-tile texture window so every tile is unique.
  const uv = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    uv[i * 3] = (r() - 0.5) * 0.6;
    uv[i * 3 + 1] = (r() - 0.5) * 0.6;
    uv[i * 3 + 2] = r() * Math.PI * 2;
  }
  geometry.setAttribute('tileUv', new THREE.InstancedBufferAttribute(uv, 3));

  const mesh = new THREE.InstancedMesh(geometry, material, n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  const color = new THREE.Color();
  const delays = targets.map(delayFor);
  const maxDelay = Math.max(...delays, 1e-6);
  const start = targets.map((t) => startFor(t, r));
  targets.forEach((_, i) => {
    color.set(colors[Math.floor(r() * colors.length)]);
    mesh.setColorAt(i, color);
  });
  return {
    mesh,
    target: targets,
    start,
    delay: delays.map((d) => d / maxDelay),
    phase: targets.map(() => r() * Math.PI * 2),
    range,
    float: !!opts.float,
  };
}

/** A soft studio "room" with a bright window, used only to light reflections. */
function environmentScene() {
  const env = new THREE.Scene();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(24, 12, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.45, 0.39), side: THREE.BackSide }));
  env.add(shell);
  const glow = (w: number, h: number, c: THREE.Color, pos: THREE.Vector3, look: THREE.Vector3) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.copy(pos);
    m.lookAt(look);
    env.add(m);
  };
  // Tall golden-hour windows: these are what glossy glazes reflect as bright streaks.
  glow(5, 9, new THREE.Color(10, 8, 5.6), new THREE.Vector3(11.8, 3.5, 2.5), new THREE.Vector3(0, 2, 0));
  glow(3, 8, new THREE.Color(7, 5.8, 4.2), new THREE.Vector3(11.8, 3.5, -4), new THREE.Vector3(0, 2, 0));
  glow(12, 5, new THREE.Color(2.4, 2.1, 1.7), new THREE.Vector3(0, 3, 11.8), new THREE.Vector3(0, 2, 0));
  glow(14, 14, new THREE.Color(1.2, 1.12, 1.02), new THREE.Vector3(0, 5.8, 0), new THREE.Vector3(0, 0, 0));
  glow(14, 14, new THREE.Color(0.8, 0.68, 0.52), new THREE.Vector3(0, -5.8, 0), new THREE.Vector3(0, 0, 0));
  return env;
}

// Tall windows in the sun-side wall: [centre z, width], sill and head heights.
const WINDOWS: [number, number][] = [
  [-0.9, 1.4],
  [1.5, 1.4],
];
const SILL = 0.45;
const HEAD = 3.95;

/**
 * The plastered sun-side wall with two tall black-framed windows. Sunlight
 * shafts into the room through these real openings.
 */
function makeWindowWall(shadows: boolean) {
  const group = new THREE.Group();
  const plaster = new THREE.MeshStandardMaterial({ color: '#ece6dc', roughness: 0.92 });
  const metal = new THREE.MeshStandardMaterial({ color: '#1c1c1e', roughness: 0.45, metalness: 0.6 });
  const T = 0.16;
  const x = ROOM.halfW + T / 2;
  const box = (z0: number, z1: number, y0: number, y1: number, mat: THREE.Material, depth = T, dx = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(depth, y1 - y0, z1 - z0), mat);
    m.position.set(x + dx, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = m.receiveShadow = shadows;
    group.add(m);
  };
  // Solid wall between and around the openings.
  let z = ROOM.back;
  for (const [cz, w] of WINDOWS) {
    box(z, cz - w / 2, 0, ROOM.height, plaster);
    box(cz - w / 2, cz + w / 2, 0, SILL, plaster);
    box(cz - w / 2, cz + w / 2, HEAD, ROOM.height, plaster);
    z = cz + w / 2;
  }
  box(z, ROOM.front, 0, ROOM.height, plaster);
  // Slim black steel frames: perimeter, centre mullion and a high transom.
  const f = 0.05;
  for (const [cz, w] of WINDOWS) {
    const z0 = cz - w / 2;
    const z1 = cz + w / 2;
    box(z0, z1, SILL, SILL + f, metal, 0.07);
    box(z0, z1, HEAD - f, HEAD, metal, 0.07);
    box(z0, z0 + f, SILL, HEAD, metal, 0.07);
    box(z1 - f, z1, SILL, HEAD, metal, 0.07);
    box(cz - f / 2, cz + f / 2, SILL, HEAD, metal, 0.07);
    box(z0, z1, HEAD - 0.85, HEAD - 0.85 + f, metal, 0.07);
  }
  return group;
}

/**
 * Invisible light blocker beyond the window wall: stops sun reaching the room
 * over the top or through the open front, so light only enters by the windows.
 */
function windowCookie() {
  const frame = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const bar = (w: number, h: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), mat);
    m.position.set(x, y, 0);
    m.castShadow = true;
    frame.add(m);
  };
  // Generous opening: the real window wall defines the shafts' exact shape.
  const W = 6;
  const H = 5;
  bar(40, 14, 0, H / 2 + 7);
  bar(40, 14, 0, -H / 2 - 7);
  bar(16, H, -W / 2 - 8, 0);
  bar(16, H, W / 2 + 8, 0);

  // Olive branches outside the glass: dappled leaf shadows that sway gently.
  const leaves = new THREE.Group();
  const lr = rng(53);
  const leafGeo = new THREE.CircleGeometry(1, 7);
  const count = 220;
  const inst = new THREE.InstancedMesh(leafGeo, mat, count);
  inst.castShadow = true;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const branches = [
    { from: [-W / 2, -0.6], to: [0.4, 0.5] },
    { from: [-W / 2 + 0.3, -1.4], to: [0.6, -0.6] },
    { from: [-W / 2 - 0.2, 0.6], to: [-0.4, 1.6] },
  ];
  for (let i = 0; i < count; i++) {
    const br = branches[i % branches.length];
    const k = lr();
    const bend = Math.sin(k * Math.PI) * 0.35;
    const x = br.from[0] + (br.to[0] - br.from[0]) * k + (lr() - 0.5) * 0.35;
    const y = br.from[1] + (br.to[1] - br.from[1]) * k + bend + (lr() - 0.5) * 0.35;
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), lr() * Math.PI * 2);
    m4.compose(new THREE.Vector3(x, y, 0.3 + lr() * 0.3), q, new THREE.Vector3(0.09, 0.024, 1));
    inst.setMatrixAt(i, m4);
  }
  leaves.add(inst);
  frame.add(leaves);
  frame.userData.leaves = leaves;

  // Sits out along the sun ray through the middle of the windows.
  const through = new THREE.Vector3(ROOM.halfW, (SILL + HEAD) / 2, (WINDOWS[0][0] + WINDOWS[1][0]) / 2);
  frame.position.copy(through).addScaledVector(SUN_DIR, 4);
  frame.lookAt(frame.position.clone().add(SUN_DIR));
  return frame;
}

/** Turned timber stool and a potted olive tree, for a lived-in finish. */
function makeDecor(shadows: boolean) {
  const group = new THREE.Group();
  // Turned timber stool: wide seat, waisted body.
  const wood = new THREE.MeshPhysicalMaterial({ color: '#a2774c', roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const stool = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0, 0],
        [0.17, 0],
        [0.15, 0.08],
        [0.11, 0.22],
        [0.15, 0.38],
        [0.2, 0.44],
        [0.2, 0.47],
        [0, 0.47],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      40,
    ),
    wood,
  );
  stool.position.set(0.5, 0, -2.6);
  group.add(stool);
  const POT = new THREE.Vector3(-0.55, 0, -3.25);

  const pot = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0, 0],
        [0.16, 0],
        [0.25, 0.14],
        [0.29, 0.36],
        [0.24, 0.58],
        [0.16, 0.66],
        [0.17, 0.7],
        [0, 0.7],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      40,
    ),
    new THREE.MeshStandardMaterial({ color: '#ddd1bd', roughness: 0.95 }),
  );
  pot.position.copy(POT);
  group.add(pot);

  const bark = new THREE.MeshStandardMaterial({ color: '#5b4a3a', roughness: 0.9 });
  const tips: THREE.Vector3[] = [];
  const tr = rng(29);
  for (let i = 0; i < 4; i++) {
    const len = 0.8 + tr() * 0.7;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, len, 6), bark);
    const lean = new THREE.Euler((tr() - 0.5) * 0.6, 0, (tr() - 0.5) * 0.6);
    stem.rotation.copy(lean);
    const dir = new THREE.Vector3(0, 1, 0).applyEuler(lean);
    stem.position.copy(POT).setY(0.66).addScaledVector(dir, len / 2);
    tips.push(POT.clone().setY(0.66).addScaledVector(dir, len));
    group.add(stem);
  }
  const leafCount = 360;
  const leaf = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 6),
    new THREE.MeshStandardMaterial({ color: '#6b7650', roughness: 0.6, side: THREE.DoubleSide }),
    leafCount,
  );
  const lm = new THREE.Matrix4();
  const tint = new THREE.Color();
  for (let i = 0; i < leafCount; i++) {
    const tip = tips[i % tips.length];
    const p = tip.clone().add(new THREE.Vector3((tr() - 0.5) * 0.55, (tr() - 0.6) * 0.6, (tr() - 0.5) * 0.55));
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tr() * Math.PI, tr() * Math.PI, tr() * Math.PI));
    lm.compose(p, q, new THREE.Vector3(0.07, 0.018, 1));
    leaf.setMatrixAt(i, lm);
    leaf.setColorAt(i, tint.set(tr() > 0.5 ? '#6b7650' : '#8a9470'));
  }
  group.add(leaf);
  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = shadows;
      o.receiveShadow = shadows;
    }
  });
  return group;
}

function makeBath(shadows: boolean) {
  const group = new THREE.Group();
  const profile = [
    [0.0, 0.0],
    [0.5, 0.0],
    [0.6, 0.04],
    [0.7, 0.24],
    [0.78, 0.52],
    [0.8, 0.6],
    [0.76, 0.62],
    [0.72, 0.56],
    [0.64, 0.3],
    [0.5, 0.12],
    [0.0, 0.1],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const shell = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 72),
    new THREE.MeshPhysicalMaterial({ color: '#fbfaf7', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide }),
  );
  shell.scale.set(1.12, 1, 0.56);
  shell.castShadow = shadows;
  shell.receiveShadow = shadows;
  group.add(shell);

  // Brushed bronze tapware.
  const black = new THREE.MeshStandardMaterial({ color: '#7a5434', roughness: 0.28, metalness: 1 });
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.92, 20), black);
  pipe.position.set(1.06, 0.46, 0);
  // Half-torus arcing from the top of the pipe out over the rim.
  const spout = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 12, 24, Math.PI), black);
  spout.position.set(0.93, 0.92, 0);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24), black);
  base.position.set(1.06, 0.01, 0);
  [pipe, spout, base].forEach((m) => {
    m.castShadow = shadows;
    group.add(m);
  });
  return group;
}

// Camera stops: [progress, position, look-at]
const SHOTS: [number, THREE.Vector3, THREE.Vector3][] = [
  [0.0, new THREE.Vector3(0, 4.2, 9.5), new THREE.Vector3(0, 2.2, 0)],
  [0.24, new THREE.Vector3(3.4, 3.0, 5.0), new THREE.Vector3(-0.4, 0, -0.6)],
  [0.48, new THREE.Vector3(0.2, 2.5, 3.6), new THREE.Vector3(0, 2.3, -4)],
  [0.72, new THREE.Vector3(1.8, 2.4, 1.4), new THREE.Vector3(-5, 2.1, -0.6)],
  [1.0, new THREE.Vector3(4.6, 3.4, 6.4), new THREE.Vector3(0.2, 1.0, -1.6)],
];

function shotAt(p: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  let i = 0;
  while (i < SHOTS.length - 2 && p > SHOTS[i + 1][0]) i++;
  const [p0, a0, l0] = SHOTS[i];
  const [p1, a1, l1] = SHOTS[i + 1];
  const t = smooth(clamp01((p - p0) / (p1 - p0)));
  outPos.lerpVectors(a0, a1, t);
  outLook.lerpVectors(l0, l1, t);
}

export function createScene(canvas: HTMLCanvasElement, getProgress: () => number) {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const shadows = true;
  const useAO = !small;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !useAO && !small, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = BG.clone();
  scene.fog = new THREE.Fog(BG.clone(), 13, 28);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environmentScene(), 0.035).texture;
  scene.environmentIntensity = 1.0;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(small ? 55 : 42, 1, 0.1, 60);

  scene.add(new THREE.HemisphereLight('#fff1de', '#cdb89a', 0.75));
  const sun = new THREE.DirectionalLight('#ffcf96', 4.6);
  sun.position.copy(SUN_DIR.clone().multiplyScalar(16));
  sun.target.position.set(0, 0, 0);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  const cookie = windowCookie();
  const windowWall = makeWindowWall(shadows);
  scene.add(sun, sun.target, cookie, windowWall);

  // Soft fill from the room side so shadows are not pitch black.
  const fill = new THREE.DirectionalLight('#e9eeff', 0.6);
  fill.position.set(-6, 5, 8);
  scene.add(fill);

  // Grout surfaces behind the tiles.
  const groutMat = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, transparent: true });
  const floorBase = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.halfW * 2, ROOM.front - ROOM.back), groutMat('#d8d2c8'));
  floorBase.rotation.x = -Math.PI / 2;
  floorBase.position.set(0, 0, (ROOM.front + ROOM.back) / 2);
  const backBase = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.halfW * 2, ROOM.height), groutMat('#e6dccb'));
  backBase.position.set(0, ROOM.height / 2, ROOM.back);
  const sideBase = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.front - ROOM.back, ROOM.height), groutMat('#d8d3c2'));
  sideBase.rotation.y = Math.PI / 2;
  sideBase.position.set(-ROOM.halfW, ROOM.height / 2, (ROOM.front + ROOM.back) / 2);
  [floorBase, backBase, sideBase].forEach((m) => (m.receiveShadow = shadows));
  scene.add(floorBase, backBase, sideBase);

  const gap = 0.012;
  const t = 0.04;

  // Floor: polished marble herringbone.
  const marble = marbleTexture(small ? 512 : 768);
  const floorMat = new THREE.MeshPhysicalMaterial({ map: marble, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 });
  perTileUv(floorMat, 0.42);
  const u = small ? 0.34 : 0.25;
  const floor = makeGroup({
    geometry: new RoundedBoxGeometry(2 * u - gap * 0.6, t, u - gap * 0.6, 2, 0.008),
    material: floorMat,
    colors: ['#ffffff', '#fbfaf8', '#f6f5f2', '#fdfdfc'],
    targets: herringbone(u).map((b) => ({ pos: new THREE.Vector3(b.x, t / 2, b.z), quat: quatY(b.rot) })),
    startFor: (tg, r) => ({
      pos: new THREE.Vector3(tg.pos.x * 0.55 + (r() - 0.5) * 2, 1.2 + r() * 3.6, tg.pos.z * 0.45 + (r() - 0.5) * 2),
      quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * Math.PI, r() * Math.PI * 2, r() * Math.PI)),
    }),
    delayFor: (tg) => Math.hypot(tg.pos.x, tg.pos.z - 1),
    range: [0.03, 0.34],
    float: true,
    seed: 11,
    shadows,
  });

  // Back wall: cream handmade-gloss subway (3:1), built from the bottom row up.
  const sw = small ? 0.72 : 0.6;
  const sh = sw / 3;
  const backTargets: Placement[] = [];
  for (let j = 0; j * sh < ROOM.height - sh / 2; j++) {
    const off = j % 2 ? sw / 2 : 0;
    for (let x = -ROOM.halfW - off; x < ROOM.halfW; x += sw) {
      const cx = x + sw / 2;
      if (cx - sw / 2 < -ROOM.halfW - 0.001 || cx + sw / 2 > ROOM.halfW + 0.001) continue;
      backTargets.push({ pos: new THREE.Vector3(cx, j * sh + sh / 2, ROOM.back + t / 2), quat: new THREE.Quaternion() });
    }
  }
  const ripples = rippleNormalTexture(256, 5, 2.2, 1);
  const backMat = new THREE.MeshPhysicalMaterial({
    map: glazeTexture(0.02, 256, 5),
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    normalMap: ripples,
    normalScale: new THREE.Vector2(0.15, 0.15),
    clearcoatNormalMap: ripples,
    clearcoatNormalScale: new THREE.Vector2(0.55, 0.55),
  });
  perTileUv(backMat, 0.35);
  const back = makeGroup({
    geometry: new RoundedBoxGeometry(sw - gap, sh - gap, t, 3, 0.012),
    material: backMat,
    colors: ['#f3ebdd', '#f0e7d7', '#f5eee2', '#eee4d3'],
    targets: backTargets,
    startFor: (tg, r) => ({
      pos: new THREE.Vector3(tg.pos.x + (r() - 0.5) * 1.5, tg.pos.y + 3 + r() * 2, tg.pos.z + 2.5 + r() * 2),
      quat: new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 2, (r() - 0.5) * 2, (r() - 0.5) * 2)),
    }),
    delayFor: (tg) => tg.pos.y * 3 + Math.abs(tg.pos.x) * 0.3,
    range: [0.28, 0.56],
    seed: 23,
    shadows,
  });

  // Side wall: handmade-look sage vertical stack, swept in from front to back.
  const fw = small ? 0.3 : 0.22;
  const fh = fw * 2;
  const wr = rng(71);
  const sideTargets: Placement[] = [];
  for (let z = ROOM.back; z + fw <= ROOM.front + 0.001; z += fw)
    for (let y = 0; y + fh <= ROOM.height + 0.001; y += fh)
      sideTargets.push({
        pos: new THREE.Vector3(-ROOM.halfW + t / 2, y + fh / 2, z + fw / 2),
        // Slightly off-flat, like real handmade zellige catching the light.
        quat: new THREE.Quaternion().setFromEuler(new THREE.Euler((wr() - 0.5) * 0.07, (wr() - 0.5) * 0.04, (wr() - 0.5) * 0.07)),
      });
  const zelligeNormals = rippleNormalTexture(256, 21, 2.6, 2.2);
  const sideMat = new THREE.MeshPhysicalMaterial({
    map: streakGlazeTexture(0.09, 256, 9),
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    normalMap: zelligeNormals,
    normalScale: new THREE.Vector2(0.4, 0.4),
    clearcoatNormalMap: zelligeNormals,
    clearcoatNormalScale: new THREE.Vector2(0.8, 0.8),
  });
  perTileUv(sideMat, 0.28);
  const side = makeGroup({
    geometry: new RoundedBoxGeometry(t, fh - gap, fw - gap, 3, 0.012),
    material: sideMat,
    colors: ['#8c987b', '#7f8c70', '#97a286', '#76836a', '#a0aa8e', '#88947a', '#717e64', '#93a083'],
    targets: sideTargets,
    startFor: (tg, r) => ({
      pos: new THREE.Vector3(tg.pos.x + 2 + r() * 2.5, tg.pos.y + (r() - 0.3) * 2, tg.pos.z + (r() - 0.5) * 1.5),
      quat: new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 2.5, (r() - 0.5) * 2.5, (r() - 0.5) * 2.5)),
    }),
    delayFor: (tg) => (ROOM.front - tg.pos.z) * 2 + tg.pos.y * 0.4,
    range: [0.52, 0.8],
    seed: 37,
    shadows,
  });

  const groups = [floor, back, side];
  groups.forEach((g) => scene.add(g.mesh));
  const bases: [THREE.Mesh, TileGroup][] = [
    [floorBase, floor],
    [backBase, back],
    [sideBase, side],
  ];

  const bath = makeBath(shadows);
  const BATH_AT = new THREE.Vector3(1.9, 0.04, -3.05);
  scene.add(bath);
  const decor = makeDecor(shadows);
  scene.add(decor);

  // Polished floor: a soft mirror layer just above the tiles (desktop only).
  let mirror: Reflector | null = null;
  type MirrorRender = (r: THREE.WebGLRenderer, s: THREE.Scene, c: THREE.Camera) => void;
  let renderMirror: MirrorRender | null = null;
  if (useAO) {
    mirror = new Reflector(new THREE.PlaneGeometry(ROOM.halfW * 2, ROOM.front - ROOM.back), {
      textureWidth: Math.round(window.innerWidth * 0.5),
      textureHeight: Math.round(window.innerHeight * 0.5),
      clipBias: 0.003,
      color: 0xffffff,
      multisample: 0,
      shader: {
        name: 'SoftMirror',
        uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, opacity: { value: 0 } },
        // Present at runtime but missing from three's type definitions.
        vertexShader: (Reflector as unknown as { ReflectorShader: { vertexShader: string } }).ReflectorShader.vertexShader,
        fragmentShader: /* glsl */ `
          uniform vec3 color;
          uniform sampler2D tDiffuse;
          uniform float opacity;
          varying vec4 vUv;
          #include <logdepthbuf_pars_fragment>
          void main() {
            #include <logdepthbuf_fragment>
            vec4 base = texture2DProj(tDiffuse, vUv);
            // Alpha comes from the reflection itself, so empty sky reflects nothing.
            gl_FragColor = vec4(base.rgb * color, base.a * opacity);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      },
    });
    const mm = mirror.material as THREE.ShaderMaterial;
    mm.transparent = true;
    mm.depthWrite = false;
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.set(0, t + 0.0015, (ROOM.front + ROOM.back) / 2);
    // Render the reflection once per frame ourselves, not inside every post-processing pass.
    // Reflector only uses the first three onBeforeRender arguments.
    renderMirror = mirror.onBeforeRender.bind(mirror) as unknown as MirrorRender;
    mirror.onBeforeRender = () => {};
    scene.add(mirror);
  }

  // Hero showpiece: one large polished slab turning in the light before the room builds.
  const slab = new THREE.Mesh(
    new RoundedBoxGeometry(1.5, 0.06, 1.5, 3, 0.022),
    new THREE.MeshPhysicalMaterial({ map: marble, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.04 }),
  );
  slab.castShadow = shadows;
  scene.add(slab);

  // Showroom mode: alternative floor finishes sharing the same layout. Switching
  // re-tiles the floor in a wave from the centre.
  const floorStyles: Record<FloorStyle, THREE.InstancedMesh> = { marble: floor.mesh } as Record<FloorStyle, THREE.InstancedMesh>;
  const styleDefs: [FloorStyle, THREE.MeshPhysicalMaterial, string[]][] = [
    // Handmade glazed: glossy with imperfect, rippled reflections.
    [
      'sage',
      new THREE.MeshPhysicalMaterial({
        map: streakGlazeTexture(0.08, 256, 31),
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        clearcoatNormalMap: rippleNormalTexture(256, 33, 2.4, 1.4),
        clearcoatNormalScale: new THREE.Vector2(0.7, 0.7),
      }),
      ['#8c987b', '#7f8c70', '#97a286', '#76836a', '#a0aa8e'],
    ],
    // Unglazed terracotta: matte clay with restrained, diffuse highlights.
    ['terracotta', new THREE.MeshPhysicalMaterial({ map: glazeTexture(0.12, 256, 13), roughness: 0.82, clearcoat: 0 }), ['#c4714d', '#ba6744', '#cc7b57', '#b3613e', '#c06c48']],
    // Honed porcelain: soft satin sheen, no mirror.
    ['charcoal', new THREE.MeshPhysicalMaterial({ map: glazeTexture(0.04, 256, 17), roughness: 0.46, clearcoat: 0.12, clearcoatRoughness: 0.55 }), ['#3d3d40', '#38383b', '#434347', '#333336']],
  ];
  // How strongly each finish mirrors the room.
  const MIRROR: Record<FloorStyle, number> = { marble: 0.34, sage: 0.2, terracotta: 0, charcoal: 0.06 };
  const sr = rng(91);
  const styleColor = new THREE.Color();
  for (const [name, mat, colors] of styleDefs) {
    perTileUv(mat, 0.3);
    const mesh = new THREE.InstancedMesh(floor.mesh.geometry, mat, floor.target.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = mesh.receiveShadow = shadows;
    for (let i = 0; i < floor.target.length; i++) mesh.setColorAt(i, styleColor.set(colors[Math.floor(sr() * colors.length)]));
    mesh.visible = false;
    floorStyles[name] = mesh;
    scene.add(mesh);
  }
  let activeStyle: FloorStyle = 'marble';
  let prevStyle: FloorStyle | null = null;
  let switchAt = 0;
  let now = 0;
  const WAVE = 0.9;
  const FLIP = 0.45;

  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const lifted = new THREE.Vector3();
  const scl = new THREE.Vector3();

  function writeFloor(i: number) {
    const active = floorStyles[activeStyle];
    if (!prevStyle) {
      m4.compose(pos, quat, one);
      active.setMatrixAt(i, m4);
      return;
    }
    // New tile rises into place as the old one sinks away.
    const k = easeOut(clamp01((now - switchAt - floor.delay[i] * WAVE) / FLIP));
    lifted.copy(pos).y += (1 - k) * 0.35;
    m4.compose(lifted, quat, scl.setScalar(Math.max(k, 1e-4)));
    active.setMatrixAt(i, m4);
    m4.compose(pos, quat, scl.setScalar(Math.max(1 - k, 1e-4)));
    floorStyles[prevStyle].setMatrixAt(i, m4);
  }

  function update(p: number, time: number) {
    now = time;
    if (prevStyle && time - switchAt > WAVE + FLIP) {
      floorStyles[prevStyle].visible = false;
      prevStyle = null;
    }

    // Showpiece slab: turns slowly, then shrinks away as the tiles take over.
    const sk = 1 - smooth(clamp01(p / 0.07));
    slab.visible = sk > 0.001;
    slab.scale.setScalar(Math.max(sk, 1e-4));
    // Centred on phones (headline on top); on desktop it sits right of the editorial headline.
    slab.position.set(small ? 0 : 1.15, (small ? 2.55 : 2.8) + Math.sin(time * 0.7) * 0.05 + (1 - sk) * 1.5, 5.6);
    slab.rotation.set(1.05 + Math.sin(time * 0.5) * 0.08, time * 0.22, Math.sin(time * 0.35) * 0.06);

    for (const g of groups) {
      const [a, b] = g.range;
      const local = (p - a) / (b - a);
      const dur = 0.3;
      for (let i = 0; i < g.target.length; i++) {
        const k = easeOut(clamp01((local - g.delay[i] * (1 - dur)) / dur));
        const s = g.start[i];
        const tg = g.target[i];
        pos.lerpVectors(s.pos, tg.pos, k);
        quat.slerpQuaternions(s.quat, tg.quat, k);
        if (k < 1) {
          // Idle drift while waiting to be laid.
          const drift = (1 - k) * (g.float ? 0.12 : 0.05);
          pos.y += Math.sin(time * 0.8 + g.phase[i]) * drift;
          pos.x += Math.cos(time * 0.6 + g.phase[i]) * drift * 0.5;
        }
        if (g === floor) {
          writeFloor(i);
        } else {
          m4.compose(pos, quat, one);
          g.mesh.setMatrixAt(i, m4);
        }
      }
      if (g === floor) {
        for (const name of Object.keys(floorStyles) as FloorStyle[]) {
          const mesh = floorStyles[name];
          mesh.visible = name === activeStyle || name === prevStyle;
          if (mesh.visible) mesh.instanceMatrix.needsUpdate = true;
        }
      } else {
        g.mesh.instanceMatrix.needsUpdate = true;
        // Wall tiles stay hidden until their chapter so the hero stays clean.
        g.mesh.visible = local > -0.05;
      }
    }
    for (const [m, g] of bases) {
      const local = (p - g.range[0]) / (g.range[1] - g.range[0]);
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.opacity = clamp01(local * 3);
      mat.transparent = mat.opacity < 1;
      m.visible = local > 0;
    }
    // The bath drops in once the room is finished.
    const bk = clamp01((p - 0.82) / 0.12);
    bath.visible = bk > 0;
    bath.position.set(BATH_AT.x, BATH_AT.y + (1 - easeOutBack(bk)) * 3, BATH_AT.z);
    decor.visible = bk > 0;
    decor.position.y = (1 - easeOutBack(bk)) * 3;

    // The floor turns mirror-polished once it is fully laid.
    if (mirror) {
      const fl = (p - floor.range[0]) / (floor.range[1] - floor.range[0]);
      // Blend reflection strength across a finish switch.
      const blend = prevStyle ? clamp01((time - switchAt) / (WAVE + FLIP)) : 1;
      const strength = prevStyle ? MIRROR[prevStyle] + (MIRROR[activeStyle] - MIRROR[prevStyle]) * blend : MIRROR[activeStyle];
      const o = clamp01((fl - 1) * 4) * strength;
      (mirror.material as THREE.ShaderMaterial).uniforms.opacity.value = o;
      mirror.visible = o > 0.001;
    }

    // The window wall rises early in the build; once it is up, sun enters only through its windows.
    const wk = smooth(clamp01((p - 0.04) / 0.14));
    windowWall.visible = wk > 0;
    windowWall.position.y = (wk - 1) * (ROOM.height + 0.2);
    cookie.visible = wk > 0.5;

    // Olive leaves outside the window sway, so their shadows drift.
    const leaves = cookie.userData.leaves as THREE.Group;
    leaves.rotation.z = Math.sin(time * 0.7) * 0.025 + Math.sin(time * 1.9) * 0.008;
    leaves.position.x = Math.sin(time * 0.5) * 0.04;
  }

  let composer: EffectComposer | null = null;
  let aoPass: GTAOPass | null = null;
  if (useAO) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    aoPass = new GTAOPass(scene, camera, 1, 1);
    aoPass.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.5, scale: 1.1, samples: 12 });
    aoPass.blendIntensity = 0.9;
    composer.addPass(aoPass);
    composer.addPass(new OutputPass());
  }

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    // Widen the view on tall, narrow screens so the room still fits.
    camera.fov = (small ? 55 : 42) * (camera.aspect < 0.8 ? 1.25 : 1);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const render = () => {
    if (mirror?.visible && renderMirror) {
      camera.updateMatrixWorld();
      // Reflect objects only: transparent background, no fog.
      const bg = scene.background;
      const fog = scene.fog;
      const clear = renderer.getClearAlpha();
      scene.background = null;
      scene.fog = null;
      renderer.setClearAlpha(0);
      renderMirror(renderer, scene, camera);
      scene.background = bg;
      scene.fog = fog;
      renderer.setClearAlpha(clear);
    }
    if (composer) composer.render();
    else renderer.render(scene, camera);
  };

  let smoothP = getProgress();
  let raf = 0;
  let running = false;
  const clock = new THREE.Clock();

  function place(p: number) {
    shotAt(p, camPos, camLook);
    camPos.x += pointer.sx * 0.35;
    camPos.y -= pointer.sy * 0.2;
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  // Adaptive quality: if the device can't hold ~40fps, shed the most expensive
  // effects first (contact shadows + reflections), then render resolution.
  let quality = 2;
  let sampleTime = 0;
  let sampleFrames = -45; // ignore warm-up frames (shader compiles, texture uploads)
  let last = 0;
  function adapt(dt: number) {
    if (quality === 0) return;
    sampleFrames++;
    if (sampleFrames <= 0) return;
    sampleTime += dt;
    if (sampleFrames < 90) return;
    const avg = sampleTime / sampleFrames;
    sampleFrames = -20;
    sampleTime = 0;
    if (avg < 0.025) return;
    if (quality === 2 && (composer || mirror)) {
      composer?.dispose();
      composer = null;
      if (mirror) {
        scene.remove(mirror);
        mirror.dispose();
        mirror = null;
      }
      quality = 1;
    } else {
      renderer.setPixelRatio(1);
      resize();
      quality = 0;
    }
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    const time = clock.getElapsedTime();
    const dt = Math.max(0, Math.min(0.1, time - last));
    last = time;
    adapt(dt);
    // Frame-rate independent easing: same feel at 60Hz and 120Hz.
    const ease = (rate: number) => 1 - Math.pow(1 - rate, dt * 60);
    smoothP += (getProgress() - smoothP) * ease(0.08);
    pointer.sx += (pointer.x - pointer.sx) * ease(0.05);
    pointer.sy += (pointer.y - pointer.sy) * ease(0.05);
    update(smoothP, time);
    place(smoothP);
    // Light warms slightly toward late afternoon for the final reveal.
    const warm = smooth(clamp01((smoothP - 0.75) / 0.25));
    sun.color.setRGB(1, 0.84 - warm * 0.05, 0.62 - warm * 0.08);
    render();
  }

  // First frame straight away so the canvas never flashes empty.
  update(smoothP, 0);
  place(smoothP);
  render();

  return {
    setFloorStyle(name: FloorStyle) {
      if (name === activeStyle || !floorStyles[name]) return;
      // A switch mid-wave snaps the old style away so only two meshes ever show.
      if (prevStyle) floorStyles[prevStyle].visible = false;
      prevStyle = activeStyle;
      activeStyle = name;
      switchAt = now;
    },
    start() {
      if (running) return;
      running = true;
      // The clock keeps running while paused; frame() clamps the resulting time step.
      frame();
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      composer?.dispose();
      renderer.dispose();
    },
  };
}
