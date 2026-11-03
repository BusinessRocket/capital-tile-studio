// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// The site's own domain (attached to the Worker in wrangler.jsonc). Keep
// public/robots.txt in step if it changes.
const SITE_URL = 'https://capitaltilestudio.com.au';

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
