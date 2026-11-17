import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

// GitHub Pages serves the site from /atlas-daily/; everywhere else it lives at /.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    // The Cloudflare plugin is only needed for Cloudflare deploys.
    ...(process.env.BASE_PATH ? [] : [cloudflare()]),
  ],
  server: {
    port: 3847,
    host: '0.0.0.0',
  },
  preview: {
    port: 3847,
    host: '0.0.0.0',
  },
})
