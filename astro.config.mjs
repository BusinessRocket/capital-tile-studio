// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Live workers.dev address. Switch to the custom domain if one is added later,
// and update public/robots.txt to match.
const SITE_URL = 'https://capital-tile-studio.capital-tile-studio.workers.dev';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'always',
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/404') })],

  vite: {
    plugins: [tailwindcss()],
  },
});
