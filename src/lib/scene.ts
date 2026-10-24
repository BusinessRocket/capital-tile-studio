// Scroll-driven 3D tiling room for the home page.
// Tiles start scattered in the air and lay themselves into a floor and two walls
// as the visitor scrolls, while the camera moves through the room.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
const BG = new THREE.Color('#fbfbfd');

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (t: number) => t * t * (3 - 2 * t);

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function quatY(rad: number) {
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rad);
}

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

function makeGroup(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  colors: string[],
  targets: Placement[],
  startFor: (t: Placement, r: () => number) => Placement,
  delayFor: (t: Placement) => number,
  range: [number, number],
  float: boolean,
  seed: number,
  shadows: boolean,
): TileGroup {
  const r = rng(seed);
  const mesh = new THREE.InstancedMesh(geometry, material, targets.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  const color = new THREE.Color();
  const start: Placement[] = [];
  const delays = targets.map(delayFor);
  const maxDelay = Math.max(...delays, 1e-6);
  targets.forEach((t, i) => {
    color.set(colors[Math.floor(r() * colors.length)]);
    mesh.setColorAt(i, color);
    start.push(startFor(t, r));
  });
  return {
    mesh,
    target: targets,
    start,
    delay: delays.map((d) => d / maxDelay),
    phase: targets.map(() => r() * Math.PI * 2),
    range,
    float,
  };
}

// Camera stops: [progress, position, look-at]
const SHOTS: [number, THREE.Vector3, THREE.Vector3][] = [
  [0.0, new THREE.Vector3(0, 4.2, 9.5), new THREE.Vector3(0, 2.2, 0)],
  [0.24, new THREE.Vector3(3.4, 3.0, 5.0), new THREE.Vector3(-0.4, 0, -0.6)],
  [0.48, new THREE.Vector3(0.2, 2.5, 3.6), new THREE.Vector3(0, 2.3, -4)],
  [0.72, new THREE.Vector3(1.8, 2.4, 1.4), new THREE.Vector3(-5, 2.1, -0.6)],
  [1.0, new THREE.Vector3(5.6, 5.4, 8.8), new THREE.Vector3(-0.6, 1.2, -1)],
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
  const shadows = !small;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = BG.clone();
  scene.fog = new THREE.Fog(BG.clone(), 14, 30);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  const camera = new THREE.PerspectiveCamera(small ? 55 : 42, 1, 0.1, 60);

  scene.add(new THREE.HemisphereLight('#ffffff', '#d9d3c8', 1.1));
  const sun = new THREE.DirectionalLight('#fff4e6', 2.2);
  sun.position.set(6, 10, 7);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Grout surfaces behind the tiles.
  const groutMat = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
  const floorBase = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.halfW * 2, ROOM.front - ROOM.back), groutMat('#a9a194'));
  floorBase.rotation.x = -Math.PI / 2;
  floorBase.position.set(0, 0, (ROOM.front + ROOM.back) / 2);
  floorBase.receiveShadow = shadows;
  const backBase = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.halfW * 2, ROOM.height), groutMat('#c9c2b6'));
  backBase.position.set(0, ROOM.height / 2, ROOM.back);
  backBase.receiveShadow = shadows;
  const sideBase = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.front - ROOM.back, ROOM.height), groutMat('#dfe2d9'));
  sideBase.rotation.y = Math.PI / 2;
  sideBase.position.set(-ROOM.halfW, ROOM.height / 2, (ROOM.front + ROOM.back) / 2);
  sideBase.receiveShadow = shadows;
  scene.add(floorBase, backBase, sideBase);

  const gap = 0.012;
  const t = 0.04;

  // Floor: marble-look herringbone.
  const u = small ? 0.34 : 0.25;
  const floorTargets: Placement[] = herringbone(u).map((b) => ({ pos: new THREE.Vector3(b.x, t / 2, b.z), quat: quatY(b.rot) }));
  const floor = makeGroup(
    new RoundedBoxGeometry(2 * u - gap, t, u - gap, 1, 0.008),
    new THREE.MeshPhysicalMaterial({ roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.18 }),
    ['#ece6dc', '#e2dace', '#f3efe8', '#d8cfc1', '#e8e1d6'],
    floorTargets,
    (tg, r) => ({
      pos: new THREE.Vector3(tg.pos.x * 0.55 + (r() - 0.5) * 2, 1.2 + r() * 3.6, tg.pos.z * 0.45 + (r() - 0.5) * 2),
      quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * Math.PI, r() * Math.PI * 2, r() * Math.PI)),
    }),
    (tg) => Math.hypot(tg.pos.x, tg.pos.z - 1),
    [0.03, 0.34],
    true,
    11,
    shadows,
  );

  // Back wall: warm white subway, built from the bottom row up.
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
  const back = makeGroup(
    new RoundedBoxGeometry(sw - gap, sh - gap, t, 1, 0.01),
    new THREE.MeshPhysicalMaterial({ roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 }),
    ['#f4f0e9', '#ebe5dc', '#f9f6f1', '#e4ddd2'],
    backTargets,
    (tg, r) => ({
      pos: new THREE.Vector3(tg.pos.x + (r() - 0.5) * 1.5, tg.pos.y + 3 + r() * 2, tg.pos.z + 2.5 + r() * 2),
      quat: new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 2, (r() - 0.5) * 2, (r() - 0.5) * 2)),
    }),
    (tg) => tg.pos.y * 3 + Math.abs(tg.pos.x) * 0.3,
    [0.28, 0.56],
    false,
    23,
    shadows,
  );

  // Side wall: sage vertical stack, swept in from front to back.
  const fw = small ? 0.3 : 0.2;
  const fh = 0.6;
  const sideTargets: Placement[] = [];
  for (let z = ROOM.back; z + fw <= ROOM.front + 0.001; z += fw)
    for (let y = 0; y + fh <= ROOM.height + 0.001; y += fh)
      sideTargets.push({ pos: new THREE.Vector3(-ROOM.halfW + t / 2, y + fh / 2, z + fw / 2), quat: new THREE.Quaternion() });
  const side = makeGroup(
    new RoundedBoxGeometry(t, fh - gap, fw - gap, 1, 0.006),
    new THREE.MeshPhysicalMaterial({ roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    ['#a7b29d', '#9eaa94', '#afb9a6', '#97a28d', '#a3ae99'],
    sideTargets,
    (tg, r) => ({
      pos: new THREE.Vector3(tg.pos.x + 2 + r() * 2.5, tg.pos.y + (r() - 0.3) * 2, tg.pos.z + (r() - 0.5) * 1.5),
      quat: new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 2.5, (r() - 0.5) * 2.5, (r() - 0.5) * 2.5)),
    }),
    (tg) => (ROOM.front - tg.pos.z) * 2 + tg.pos.y * 0.4,
    [0.52, 0.8],
    false,
    37,
    shadows,
  );

  const groups = [floor, back, side];
  groups.forEach((g) => scene.add(g.mesh));

  // Only show the grout surfaces once tiles start arriving on them.
  const bases: [THREE.Mesh, TileGroup][] = [
    [floorBase, floor],
    [backBase, back],
    [sideBase, side],
  ];
  bases.forEach(([m]) => {
    (m.material as THREE.MeshStandardMaterial).transparent = true;
  });

  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);

  function updateTiles(p: number, time: number) {
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
      // Wall and side tiles are hidden until their chapter so the hero stays clean.
      g.mesh.visible = g.float || local > -0.05;
    }
    for (const [m, g] of bases) {
      const local = (p - g.range[0]) / (g.range[1] - g.range[0]);
      (m.material as THREE.MeshStandardMaterial).opacity = clamp01(local * 3);
      m.visible = local > 0;
    }
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
    camera.aspect = w / h;
    // Pull the camera back on tall, narrow screens so the room still fits.
    camera.fov = (small ? 55 : 42) * (camera.aspect < 0.8 ? 1.25 : 1);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let smoothP = getProgress();
  let running = false;
  let raf = 0;
  const clock = new THREE.Clock();

  function frame() {
    raf = requestAnimationFrame(frame);
    const time = clock.getElapsedTime();
    smoothP += (getProgress() - smoothP) * 0.08;
    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;

    updateTiles(smoothP, time);
    shotAt(smoothP, camPos, camLook);
    camPos.x += pointer.sx * 0.35;
    camPos.y -= pointer.sy * 0.2;
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    // Warmer light for the final reveal.
    const warm = smooth(clamp01((smoothP - 0.8) / 0.2));
    sun.color.setRGB(1, 0.957 - warm * 0.08, 0.9 - warm * 0.18);
    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    clock.start();
    frame();
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // Render a first frame immediately so the canvas never flashes empty.
  updateTiles(smoothP, 0);
  shotAt(smoothP, camPos, camLook);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  renderer.render(scene, camera);

  return {
    start,
    stop,
    dispose() {
      stop();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      renderer.dispose();
    },
  };
}
