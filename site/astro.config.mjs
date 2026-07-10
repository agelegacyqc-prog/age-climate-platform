import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://age-qc.com',
  output: 'static',
  integrations: [sitemap()],
});