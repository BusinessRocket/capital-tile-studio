// Scroll-driven 3D tiling room for the home page.
// Tiles start scattered in the air and lay themselves into a floor and two walls
// as the visitor scrolls, while the camera moves through a daylit bathroom.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { glazeTexture, marbleTexture, perTileUv } from './textures';

type Placement = { pos: THREE.Vector3; quat: THREE.Quaternion };

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
const BG = new THREE.Color('#f7f5f1');
const SUN_DIR = new THREE.Vector3(6, 9, 5).normalize();

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
  const shell = new THREE.Mesh(new THREE.BoxGeometry(24, 12, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.53, 0.5), side: THREE.BackSide }));
  env.add(shell);
  const glow = (w: number, h: number, c: THREE.Color, pos: THREE.Vector3, look: THREE.Vector3) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.copy(pos);
    m.lookAt(look);
    env.add(m);
  };
  // Big daylight window on the sun side, a soft ceiling panel and a warm floor bounce.
  glow(9, 6, new THREE.Color(7, 6.6, 6), new THREE.Vector3(11.5, 4, 3), new THREE.Vector3(0, 2, 0));
  glow(14, 14, new THREE.Color(1.6, 1.6, 1.6), new THREE.Vector3(0, 5.8, 0), new THREE.Vector3(0, 0, 0));
  glow(14, 14, new THREE.Color(0.75, 0.68, 0.58), new THREE.Vector3(0, -5.8, 0), new THREE.Vector3(0, 0, 0));
  return env;
}

/** Invisible window frame that throws mullion shadows into the room. */
function windowCookie() {
  const frame = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const bar = (w: number, h: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), mat);
    m.position.set(x, y, 0);
    m.castShadow = true;
    frame.add(m);
  };
  const W = 3.4;
  const H = 2.8;
  const b = 0.12;
  bar(W, b, 0, H / 2);
  bar(W, b, 0, -H / 2);
  bar(b, H, -W / 2, 0);
  bar(b, H, W / 2, 0);
  bar(b * 0.7, H, 0, 0);
  bar(W, b * 0.7, 0, 0);
  // Walls around the window so light only enters through the glass.
  const wall = (w: number, h: number, x: number, y: number) => bar(w, h, x, y);
  wall(30, 12, 0, H / 2 + 6);
  wall(30, 12, 0, -H / 2 - 6);
  wall(14, H, -W / 2 - 7, 0);
  wall(14, H, W / 2 + 7, 0);
  frame.position.copy(SUN_DIR.clone().multiplyScalar(7.5)).add(new THREE.Vector3(0.6, 0, -0.4));
  frame.lookAt(frame.position.clone().add(SUN_DIR));
  return frame;
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

  const black = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.35, metalness: 0.6 });
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
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = BG.clone();
  scene.fog = new THREE.Fog(BG.clone(), 13, 28);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environmentScene(), 0.035).texture;
  scene.environmentIntensity = 0.95;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(small ? 55 : 42, 1, 0.1, 60);

  scene.add(new THREE.HemisphereLight('#f6f7ff', '#cbbfae', 1.0));
  const sun = new THREE.DirectionalLight('#ffe9cf', 3.6);
  sun.position.copy(SUN_DIR.clone().multiplyScalar(16));
  sun.target.position.set(0, 0, 0);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target, windowCookie());

  // Soft fill from the room side so shadows are not pitch black.
  const fill = new THREE.DirectionalLight('#eef1ff', 0.9);
  fill.position.set(-6, 5, 8);
  scene.add(fill);

  // Grout surfaces behind the tiles.
  const groutMat = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, transparent: true });
  const floorBase = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.halfW * 2, ROOM.front - ROOM.back), groutMat('#d8d2c8'));
  floorBase.rotation.x = -Math.PI / 2;
  floorBase.position.set(0, 0, (ROOM.front + ROOM.back) / 2);
  const backBase = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.halfW * 2, ROOM.height), groutMat('#dcd7ce'));
  backBase.position.set(0, ROOM.height / 2, ROOM.back);
  const sideBase = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.front - ROOM.back, ROOM.height), groutMat('#d9dcd2'));
  sideBase.rotation.y = Math.PI / 2;
  sideBase.position.set(-ROOM.halfW, ROOM.height / 2, (ROOM.front + ROOM.back) / 2);
  [floorBase, backBase, sideBase].forEach((m) => (m.receiveShadow = shadows));
  scene.add(floorBase, backBase, sideBase);

  const gap = 0.012;
  const t = 0.04;

  // Floor: polished marble herringbone.
  const marble = marbleTexture(small ? 384 : 512);
  const floorMat = new THREE.MeshPhysicalMaterial({ map: marble, roughness: 0.09, clearcoat: 1, clearcoatRoughness: 0.06 });
  perTileUv(floorMat, 0.55);
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

  // Back wall: gloss white subway, built from the bottom row up.
  const sw = small ? 0.8 : 0.6;
  const sh = sw / 2;
  const backTargets: Placement[] = [];
  for (let j = 0; j * sh < ROOM.height - sh / 2; j++) {
    const off = j % 2 ? sw / 2 : 0;
    for (let x = -ROOM.halfW - off; x < ROOM.halfW; x += sw) {
      const cx = x + sw / 2;
      if (cx - sw / 2 < -ROOM.halfW - 0.001 || cx + sw / 2 > ROOM.halfW + 0.001) continue;
      backTargets.push({ pos: new THREE.Vector3(cx, j * sh + sh / 2, ROOM.back + t / 2), quat: new THREE.Quaternion() });
    }
  }
  const backMat = new THREE.MeshPhysicalMaterial({ map: glazeTexture(0.025, 256, 5), roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04 });
  perTileUv(backMat, 0.18);
  const back = makeGroup({
    geometry: new RoundedBoxGeometry(sw - gap, sh - gap, t, 3, 0.014),
    material: backMat,
    colors: ['#f7f6f3', '#f4f3ef', '#f9f8f6', '#f2f1ed'],
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
  const fw = small ? 0.3 : 0.2;
  const fh = 0.6;
  const wr = rng(71);
  const sideTargets: Placement[] = [];
  for (let z = ROOM.back; z + fw <= ROOM.front + 0.001; z += fw)
    for (let y = 0; y + fh <= ROOM.height + 0.001; y += fh)
      sideTargets.push({
        pos: new THREE.Vector3(-ROOM.halfW + t / 2, y + fh / 2, z + fw / 2),
        // A hair off-flat, like real glazed handmade tiles catching the light.
        quat: new THREE.Quaternion().setFromEuler(new THREE.Euler((wr() - 0.5) * 0.03, 0, (wr() - 0.5) * 0.03)),
      });
  const sideMat = new THREE.MeshPhysicalMaterial({ map: glazeTexture(0.07, 256, 9), roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.1 });
  perTileUv(sideMat, 0.22);
  const side = makeGroup({
    geometry: new RoundedBoxGeometry(t, fh - gap, fw - gap, 2, 0.01),
    material: sideMat,
    colors: ['#9fac94', '#94a189', '#a8b39e', '#8d9a83', '#a1ad97', '#b0baa6'],
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

  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);

  function update(p: number, time: number) {
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
        m4.compose(pos, quat, one);
        g.mesh.setMatrixAt(i, m4);
      }
      g.mesh.instanceMatrix.needsUpdate = true;
      // Wall tiles stay hidden until their chapter so the hero stays clean.
      g.mesh.visible = g.float || local > -0.05;
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

  const render = () => (composer ? composer.render() : renderer.render(scene, camera));

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

  function frame() {
    raf = requestAnimationFrame(frame);
    const time = clock.getElapsedTime();
    smoothP += (getProgress() - smoothP) * 0.08;
    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;
    update(smoothP, time);
    place(smoothP);
    // Light warms slightly toward late afternoon for the final reveal.
    const warm = smooth(clamp01((smoothP - 0.75) / 0.25));
    sun.color.setRGB(1, 0.915 - warm * 0.06, 0.81 - warm * 0.12);
    render();
  }

  // First frame straight away so the canvas never flashes empty.
  update(smoothP, 0);
  place(smoothP);
  render();

  return {
    start() {
      if (running) return;
      running = true;
      clock.start();
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
