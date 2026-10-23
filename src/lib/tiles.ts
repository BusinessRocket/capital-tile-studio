import type { TilePalette, TilePattern } from '../data/site';

export const palettes: Record<TilePalette, { tiles: string[]; grout: string; vein?: string }> = {
  marble: { tiles: ['#f3f1ed', '#ece9e3', '#f7f5f1', '#e7e3dc'], grout: '#d3cec5', vein: '#a9a196' },
  charcoal: { tiles: ['#3a3a3d', '#343437', '#414145', '#2e2e31'], grout: '#1b1b1d' },
  sage: { tiles: ['#a7b29d', '#9eaa94', '#afb9a6', '#97a28d'], grout: '#e8eae3' },
  terracotta: { tiles: ['#c4714d', '#ba6744', '#cc7b57', '#b3613e'], grout: '#ead9cb' },
  sand: { tiles: ['#dac8a8', '#d2bf9e', '#e1d0b2', '#cab793'], grout: '#f2ece1' },
  navy: { tiles: ['#2f3d52', '#29364a', '#37465d', '#243043'], grout: '#e4e7ec' },
};

type Poly = number[][];

// Small deterministic PRNG so every build renders the same artwork.
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

const rect = (x: number, y: number, w: number, h: number): Poly => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

function intersects(p: Poly, x0: number, y0: number, x1: number, y1: number) {
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  return Math.max(...xs) >= x0 && Math.min(...xs) <= x1 && Math.max(...ys) >= y0 && Math.min(...ys) <= y1;
}

/** Tiles covering the box [x0,x1]×[y0,y1] in the pattern's own coordinates. */
function layout(pattern: TilePattern, u: number, x0: number, y0: number, x1: number, y1: number): Poly[] {
  const out: Poly[] = [];
  const nx = Math.ceil((x1 - x0) / u) + 8;
  const ny = Math.ceil((y1 - y0) / u) + 8;
  const sx = Math.floor(x0 / u) - 4;
  const sy = Math.floor(y0 / u) - 4;

  switch (pattern) {
    case 'herringbone': {
      // Staircases of one horizontal (2×1) and one vertical (1×2) brick, repeated every 4 units.
      const kMin = sy - 2;
      const kMax = sy + ny + 2;
      const mMin = Math.floor((sx - kMax) / 4) - 1;
      const mMax = Math.ceil((sx + nx - kMin) / 4) + 1;
      for (let k = kMin; k <= kMax; k++) {
        for (let m = mMin; m <= mMax; m++) {
          const x = (k + 4 * m) * u;
          out.push(rect(x, k * u, 2 * u, u));
          out.push(rect(x, (k + 1) * u, u, 2 * u));
        }
      }
      break;
    }
    case 'subway': {
      for (let j = sy; j < sy + ny; j++) {
        const off = j % 2 === 0 ? 0 : u;
        for (let i = Math.floor(sx / 2) - 1; i < sx / 2 + nx / 2 + 1; i++) out.push(rect(i * 2 * u + off, j * u, 2 * u, u));
      }
      break;
    }
    case 'stack': {
      for (let j = Math.floor(sy / 4) - 1; j < (sy + ny) / 4 + 1; j++)
        for (let i = sx; i < sx + nx; i++) out.push(rect(i * u, j * 4 * u, u, 4 * u));
      break;
    }
    case 'grid': {
      for (let j = Math.floor(sy / 2) - 1; j < (sy + ny) / 2 + 1; j++)
        for (let i = Math.floor(sx / 2) - 1; i < (sx + nx) / 2 + 1; i++) out.push(rect(i * 2 * u, j * 2 * u, 2 * u, 2 * u));
      break;
    }
    case 'hex': {
      const r = u;
      const h = Math.sqrt(3) * r;
      for (let i = Math.floor(x0 / (1.5 * r)) - 2; i < x1 / (1.5 * r) + 2; i++) {
        for (let j = Math.floor(y0 / h) - 2; j < y1 / h + 2; j++) {
          const cx = 1.5 * r * i;
          const cy = h * (j + (Math.abs(i) % 2) / 2);
          out.push(Array.from({ length: 6 }, (_, k) => [cx + r * Math.cos((Math.PI / 3) * k), cy + r * Math.sin((Math.PI / 3) * k)]));
        }
      }
      break;
    }
    case 'chevron': {
      const w = 1.5 * u;
      const h = 0.75 * u;
      for (let i = Math.floor(x0 / w) - 2; i < x1 / w + 2; i++) {
        const up = Math.abs(i) % 2 === 0;
        const a = up ? w : 0;
        const b = up ? 0 : w;
        for (let j = Math.floor(y0 / h) - 4; j < y1 / h + 4; j++) {
          const xa = i * w;
          const xb = xa + w;
          const y = j * h;
          out.push([
            [xa, y + a],
            [xb, y + b],
            [xb, y + h + b],
            [xa, y + h + a],
          ]);
        }
      }
      break;
    }
  }
  return out.filter((p) => intersects(p, x0, y0, x1, y1));
}

export function renderTiles(opts: {
  pattern: TilePattern;
  palette: TilePalette;
  width: number;
  height: number;
  unit?: number;
  seed?: number;
}) {
  const { pattern, palette, width: W, height: H } = opts;
  const u = opts.unit ?? Math.round(Math.max(W, H) / 14);
  const pal = palettes[palette];
  const rand = rng(opts.seed ?? W * 7 + H * 13 + pattern.length * 101);
  const rotate = pattern === 'herringbone' ? 45 : 0;
  // Rotated layouts need extra coverage so corners are never empty.
  const pad = rotate ? Math.hypot(W, H) / 2 : u;
  const cx = W / 2;
  const cy = H / 2;
  const polys = layout(pattern, u, cx - pad - W / 2, cy - pad - H / 2, cx + pad + W / 2, cy + pad + H / 2);

  const tiles = polys.map((p) => ({
    points: p.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(' '),
    fill: pal.tiles[Math.floor(rand() * pal.tiles.length)],
  }));

  const veins = pal.vein
    ? Array.from({ length: 4 }, () => {
        const y = rand() * H;
        const c1 = [W * 0.3, y + (rand() - 0.5) * H * 0.6];
        const c2 = [W * 0.7, y + (rand() - 0.5) * H * 0.6];
        return `M -20 ${y.toFixed(0)} C ${c1[0].toFixed(0)} ${c1[1].toFixed(0)}, ${c2[0].toFixed(0)} ${c2[1].toFixed(0)}, ${W + 20} ${(y + (rand() - 0.5) * H * 0.4).toFixed(0)}`;
      })
    : [];

  return {
    tiles,
    grout: pal.grout,
    vein: pal.vein,
    veins,
    groutWidth: Math.max(1.5, u * 0.045),
    transform: rotate ? `rotate(${rotate} ${cx} ${cy})` : undefined,
    dark: palette === 'charcoal' || palette === 'navy',
  };
}
