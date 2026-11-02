// Job photos in src/assets/gallery/, in the order gallery.json lists them.
import type { ImageMetadata } from 'astro';
import entries from '../assets/gallery/gallery.json';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/gallery/*.jpg', { eager: true });

export type GalleryPhoto = (typeof photos)[number];

export const photos = entries.map((entry) => {
  const match = Object.entries(files).find(([path]) => path.endsWith(`/${entry.file}`));
  if (!match) throw new Error(`gallery.json lists ${entry.file}, but it is not in src/assets/gallery/`);
  return {
    ...entry,
    image: match[1].default,
    serviceLabel: entry.service.charAt(0).toUpperCase() + entry.service.slice(1),
  };
});
