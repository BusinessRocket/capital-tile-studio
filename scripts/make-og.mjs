// Renders public/og.png (1200×630) for social link previews.
// Run with: node scripts/make-og.mjs
import sharp from 'sharp';
import { renderTiles } from '../src/lib/tiles.ts';

const W = 1200;
const H = 630;
const art = renderTiles({ pattern: 'herringbone', palette: 'marble', width: 560, height: H, unit: 46, seed: 7 });

const tiles = art.tiles.map((t) => `<polygon points="${t.points}" fill="${t.fill}"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fbfbfd"/>
  <svg x="${W - 560}" y="0" width="560" height="${H}" viewBox="0 0 560 ${H}">
    <rect width="560" height="${H}" fill="${art.grout}"/>
    <g transform="${art.transform}" stroke="${art.grout}" stroke-width="${art.groutWidth}">${tiles}</g>
  </svg>
  <g font-family="Segoe UI, Helvetica Neue, Arial, sans-serif">
    <g transform="translate(72 96)">
      <rect width="22" height="22" rx="4" fill="#1d1d1f"/>
      <rect x="26" width="22" height="22" rx="4" fill="#1d1d1f" opacity="0.35"/>
      <rect y="26" width="22" height="22" rx="4" fill="#1d1d1f" opacity="0.35"/>
      <rect x="26" y="26" width="22" height="22" rx="4" fill="#a8540f"/>
      <text x="66" y="34" font-size="28" font-weight="600" fill="#1d1d1f">Capital Tile Studio</text>
    </g>
    <text x="72" y="300" font-size="84" font-weight="700" fill="#1d1d1f" letter-spacing="-2">Tiling,</text>
    <text x="72" y="392" font-size="84" font-weight="700" fill="#1d1d1f" letter-spacing="-2">perfected.</text>
    <text x="72" y="462" font-size="30" fill="#424245">Premium tiling across Canberra</text>
    <text x="72" y="540" font-size="30" font-weight="600" fill="#a8540f">Floors from $63 per m²  ·  0401 183 924</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/og.png');
console.log('Wrote public/og.png');
