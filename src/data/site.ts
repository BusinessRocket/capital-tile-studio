// Single source of truth for business details. Anything marked TODO still needs
// a real value from the owner before it should appear on the site.

export const site = {
  name: 'Capital Tile Studio',
  tagline: 'Premium tiling across Canberra',
  contactName: 'Kabir',
  phone: '0401 183 924',
  phoneHref: '+61401183924',
  email: 'capitaltilestudioact@gmail.com',
  // TODO: real 11-digit ABN. Left empty so it is not shown or put in schema.
  abn: '',
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
export type ExtraId = 'waterproofing' | 'screed' | 'removal' | 'niche';

/** Full price list, all prices in AUD. The estimator and Pricing page both read from here. */
export const pricing = {
  // Labour rate per m² by tile size. Supply & lay adds `supplyAdd` per m².
  tiles: [
    { id: 'standard', label: 'Standard tiles', detail: 'Up to 600 × 600 mm', labour: site.rates.labour },
    { id: 'large', label: 'Large format', detail: '1200 × 600 mm', labour: 80 },
    { id: 'mosaic', label: 'Mosaic & small tiles', detail: 'Hexagon, finger, small subway', labour: 110 },
  ] as { id: TileSize; label: string; detail: string; labour: number }[],
  supplyAdd: site.rates.supplied - site.rates.labour,
  patternAdd: 20, // herringbone or chevron, per m²
  extraLarge: 'Extra-large tiles (1200 × 1200 mm and up) are quoted per job.',
  splashback: { rate: 65, minimum: 350 },
  extras: [
    { id: 'waterproofing', label: 'Waterproofing', unit: 'm²', price: 55 },
    { id: 'screed', label: 'Screed & floor levelling', unit: 'm²', price: 35 },
    { id: 'removal', label: 'Old tile removal', unit: 'm²', price: 30 },
    { id: 'niche', label: 'Shower or bath niche', unit: 'each', price: 250 },
  ] as { id: ExtraId; label: string; unit: 'm²' | 'each'; price: number }[],
  minimum: 350, // minimum charge for any job
};

export type TilePattern = 'herringbone' | 'subway' | 'hex' | 'grid' | 'stack' | 'chevron';
export type TilePalette = 'marble' | 'charcoal' | 'sage' | 'terracotta' | 'sand' | 'navy';

export const services: {
  slug: string;
  title: string;
  short: string;
  body: string;
  points: string[];
  pattern: TilePattern;
  palette: TilePalette;
}[] = [
  {
    slug: 'bathrooms',
    title: 'Bathrooms & ensuites',
    short: 'Floors, walls, niches and shower recesses, finished square and clean.',
    body: 'The room where tiling matters most. We set out every wall and floor so cuts land where you will not notice them, lines run true, and grout joints stay even from corner to corner.',
    points: ['Floor and wall tiling', 'Shower recesses and niches', 'Feature walls', 'Clean silicone and trims'],
    pattern: 'subway',
    palette: 'marble',
  },
  {
    slug: 'floors',
    title: 'Floor tiling',
    short: 'Living areas, kitchens, laundries and entries in any format.',
    body: 'From large-format porcelain to classic herringbone, floors are laid flat and level with consistent joints, so they look right and wear well for years.',
    points: ['Large-format porcelain', 'Herringbone and patterned layouts', 'Kitchens, laundries and entries', 'Level, even finish'],
    pattern: 'herringbone',
    palette: 'sand',
  },
  {
    slug: 'walls',
    title: 'Wall tiling & feature walls',
    short: 'Statement walls and full-height tiling with crisp, straight lines.',
    body: 'Full-height walls and statement features need perfect set-out. We plan the layout before the first tile goes up so the finished wall looks balanced and intentional.',
    points: ['Full-height wall tiling', 'Feature and statement walls', 'Vertical and stacked layouts', 'Mitred and trimmed edges'],
    pattern: 'stack',
    palette: 'sage',
  },
  {
    slug: 'splashbacks',
    title: 'Kitchen splashbacks',
    short: 'A quick upgrade that changes the whole kitchen.',
    body: 'Subway, finger, hexagon or large slabs. Splashbacks are tiled neatly around power points, windows and rangehoods for a finish that looks built-in.',
    points: ['Subway and finger tiles', 'Hexagon and mosaic', 'Neat cuts around fittings', 'Quick turnaround'],
    pattern: 'hex',
    palette: 'navy',
  },
  {
    slug: 'outdoor',
    title: 'Outdoor & alfresco',
    short: 'Patios, alfresco areas and entries made for Canberra weather.',
    body: 'Outdoor tiling needs the right tiles, the right fall and the right adhesives for Canberra frosts and summer heat. We lay patios and entries to shed water and last.',
    points: ['Patios and alfresco areas', 'Front entries and steps', 'Correct falls for drainage', 'Slip-resistant tile options'],
    pattern: 'grid',
    palette: 'charcoal',
  },
  {
    slug: 'repairs',
    title: 'Regrouting & repairs',
    short: 'Cracked tiles replaced and tired grout brought back to life.',
    body: 'Not every job is a renovation. We replace cracked or drummy tiles, regrout tired floors and showers, and refresh silicone so the room looks cared for again.',
    points: ['Cracked tile replacement', 'Regrouting floors and showers', 'Silicone replacement', 'Small jobs welcome'],
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
