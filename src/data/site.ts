// Single source of truth for business details. Anything marked TODO still needs
// a real value from the owner before it should appear on the site.

export const site = {
  name: 'Capital Tile Studio',
  tagline: 'Premium tiling across Canberra',
  phone: '+61 435 151 933',
  phoneHref: '+61435151933',
  email: 'capitaltilestudioact@gmail.com',
  // EmailJS sends quote requests from the website straight to `email` above, and the
  // template's Auto-Reply thanks the customer. These IDs are public and safe in page code.
  // Leave any empty to fall back to opening the visitor's own email app.
  emailjs: {
    serviceId: 'service_47n6a95',
    templateId: 'template_vyj0uka',
    publicKey: 'RsX4_2ggoC8he6PeF',
  },
  abn: '16 298 142 758',
  yearsExperience: 14,
  insurance: '$10 million public liability insurance',
  locality: 'Canberra',
  region: 'ACT',
  // TODO: confirm the neighbouring towns you travel to.
  areas: [
    'Belconnen',
    'Gungahlin',
    'Inner North',
    'Inner South',
    'Woden Valley',
    'Weston Creek',
    'Molonglo Valley',
    'Tuggeranong',
    'Queanbeyan',
    'Jerrabomberra',
    'Googong',
    'Murrumbateman',
  ],
  // Headline floor & wall tiling rates for standard tiles, per m².
  rates: {
    labour: 63, // you supply the tiles
    supplied: 93, // we supply and lay the tiles
  },
  // Only real, attributable reviews go here. The section stays hidden while empty.
  reviews: [] as { name: string; suburb: string; text: string }[],
};

export type TileSize = 'standard' | 'large' | 'mosaic';
export type ExtraId = 'waterproofing' | 'screed' | 'removal' | 'niche' | 'repairs';
export type ExtraUnit = 'm²' | 'each' | 'hour';

/**
 * Full price list, all prices in AUD. The estimator and Pricing page both
 * read from here. Per-m² and hourly rates sit $2 below the original list ($65 → $63 base).
 */
export const pricing = {
  // Not registered for GST, so prices must not say they include it.
  gstIncluded: false,
  // Labour rate per m² by tile size. Supply & lay adds `supplyAdd` per m².
  tiles: [
    { id: 'standard', label: 'Standard tiles', detail: 'Up to 600 × 600 mm', labour: site.rates.labour },
    { id: 'large', label: 'Large format', detail: '1200 × 600 mm', labour: 78 },
    { id: 'mosaic', label: 'Mosaic & small tiles', detail: 'Hexagon, finger, small subway', labour: 108 },
  ] as { id: TileSize; label: string; detail: string; labour: number }[],
  supplyAdd: site.rates.supplied - site.rates.labour,
  // Supply & lay covers porcelain from our standard range up to this retail value per m².
  // Customers who pick another tile get this credited and pay the difference.
  tileAllowance: 30,
  patternAdd: 20, // herringbone or chevron, per m²
  extraLarge: 'Extra-large tiles (1200 × 1200 mm and up) are quoted per job.',
  splashback: { rate: 63, minimum: 350 },
  extras: [
    { id: 'waterproofing', label: 'Waterproofing', unit: 'm²', price: 53 },
    { id: 'screed', label: 'Screed & floor levelling', unit: 'm²', price: 33 },
    { id: 'removal', label: 'Old tile removal', unit: 'm²', price: 28 },
    { id: 'niche', label: 'Shower or bath niche', unit: 'each', price: 250 },
    { id: 'repairs', label: 'Small jobs & repairs', unit: 'hour', price: 63 },
  ] as { id: ExtraId; label: string; unit: ExtraUnit; price: number }[],
  minimum: 350, // minimum charge for any job
};

export type TilePattern = 'herringbone' | 'subway' | 'hex' | 'grid' | 'stack' | 'chevron';
export type TilePalette = 'marble' | 'charcoal' | 'sage' | 'terracotta' | 'sand' | 'navy';

// Price lines for the Services page, worked out from `pricing` so the two never disagree.
const aud = (n: number) => `$${n.toLocaleString('en-AU')}`;
const extra = (id: ExtraId) => pricing.extras.find((x) => x.id === id)!;
const tile = (id: TileSize) => pricing.tiles.find((t) => t.id === id)!;
const standard = tile('standard').labour;

export type PriceLine = { label: string; price: string };

export const services: {
  slug: string;
  title: string;
  short: string;
  body: string;
  points: string[];
  prices: PriceLine[];
  // Section of the Pricing page with the full detail for this service.
  pricesAnchor: 'rates' | 'splashbacks' | 'extras';
  pattern: TilePattern;
  palette: TilePalette;
}[] = [
  {
    slug: 'bathrooms',
    title: 'Bathrooms & ensuites',
    short: 'Floors, walls, niches and shower recesses, finished square and clean.',
    body: 'The room where tiling matters most. We set out every wall and floor so cuts land where you will not notice them, lines run true, and grout joints stay even from corner to corner.',
    points: ['Floor and wall tiling', 'Shower recesses and niches', 'Feature walls', 'Clean silicone and trims'],
    prices: [
      { label: 'Floor & wall tiling', price: `from ${aud(standard)}/m²` },
      { label: extra('waterproofing').label, price: `${aud(extra('waterproofing').price)}/m²` },
      { label: extra('niche').label, price: `${aud(extra('niche').price)} each` },
    ],
    pricesAnchor: 'rates',
    pattern: 'subway',
    palette: 'marble',
  },
  {
    slug: 'floors',
    title: 'Floor tiling',
    short: 'Living areas, kitchens, laundries and entries in any format.',
    body: 'From large-format porcelain to classic herringbone, floors are laid flat and level with consistent joints, so they look right and wear well for years.',
    points: ['Large-format porcelain', 'Herringbone and patterned layouts', 'Kitchens, laundries and entries', 'Level, even finish'],
    prices: [
      { label: 'Labour only', price: `from ${aud(standard)}/m²` },
      { label: 'Tiles supplied', price: `from ${aud(standard + pricing.supplyAdd)}/m²` },
      { label: 'Herringbone or chevron', price: `add ${aud(pricing.patternAdd)}/m²` },
    ],
    pricesAnchor: 'rates',
    pattern: 'herringbone',
    palette: 'sand',
  },
  {
    slug: 'walls',
    title: 'Wall tiling & feature walls',
    short: 'Statement walls and full-height tiling with crisp, straight lines.',
    body: 'Full-height walls and statement features need perfect set-out. We plan the layout before the first tile goes up so the finished wall looks balanced and intentional.',
    points: ['Full-height wall tiling', 'Feature and statement walls', 'Vertical and stacked layouts', 'Mitred and trimmed edges'],
    prices: (['standard', 'large', 'mosaic'] as TileSize[]).map((id) => ({ label: tile(id).label, price: `${aud(tile(id).labour)}/m²` })),
    pricesAnchor: 'rates',
    pattern: 'stack',
    palette: 'sage',
  },
  {
    slug: 'splashbacks',
    title: 'Kitchen splashbacks',
    short: 'A quick upgrade that changes the whole kitchen.',
    body: 'Subway, finger, hexagon or large slabs. Splashbacks are tiled neatly around power points, windows and rangehoods for a finish that looks built-in.',
    points: ['Subway and finger tiles', 'Hexagon and mosaic', 'Neat cuts around fittings', 'Quick turnaround'],
    prices: [
      { label: 'Splashback tiling', price: `${aud(pricing.splashback.rate)}/m²` },
      { label: 'Minimum per splashback', price: aud(pricing.splashback.minimum) },
    ],
    pricesAnchor: 'splashbacks',
    pattern: 'hex',
    palette: 'navy',
  },
  {
    slug: 'outdoor',
    title: 'Outdoor & alfresco',
    short: 'Patios, alfresco areas and entries made for Canberra weather.',
    body: 'Outdoor tiling needs the right tiles, the right fall and the right adhesives for Canberra frosts and summer heat. We lay patios and entries to shed water and last.',
    points: ['Patios and alfresco areas', 'Front entries and steps', 'Correct falls for drainage', 'Slip-resistant tile options'],
    prices: [
      { label: 'Outdoor tiling', price: `from ${aud(standard)}/m²` },
      { label: 'Natural stone & pavers', price: 'Quoted per job' },
    ],
    pricesAnchor: 'rates',
    pattern: 'grid',
    palette: 'charcoal',
  },
  {
    slug: 'repairs',
    title: 'Regrouting & repairs',
    short: 'Cracked tiles replaced and tired grout brought back to life.',
    body: 'Not every job is a renovation. We replace cracked or drummy tiles, regrout tired floors and showers, and refresh silicone so the room looks cared for again.',
    points: ['Cracked tile replacement', 'Regrouting floors and showers', 'Silicone replacement', 'Small jobs welcome'],
    prices: [
      { label: extra('repairs').label, price: `${aud(extra('repairs').price)}/hour` },
      { label: 'Minimum charge (covers travel & set-up)', price: aud(pricing.minimum) },
    ],
    pricesAnchor: 'extras',
    pattern: 'chevron',
    palette: 'terracotta',
  },
];

export const nav = [
  { href: '/services/', label: 'Services' },
  { href: '/pricing/', label: 'Pricing' },
  { href: '/gallery/', label: 'Gallery' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
];
