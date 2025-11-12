import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const BASE = '/ju-smile-calorie-app/'
const DATA_REV = '2025-11-12-2055' // ← 換一個新字串

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      filename: 'sw.js',
      injectRegister: null,     // 你已在 main.tsx 用 virtual:pwa-register 了

      manifest: false,          // 我們用 public/manifest.json
      workbox: {
        // ❗ 不要掃 csv/json；資料檔由 additionalManifestEntries 管
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],

        additionalManifestEntries: [
          { url: 'data/Food_DB.csv',      revision: DATA_REV },
          { url: 'data/Unit_Map.csv',     revision: DATA_REV },
          { url: 'data/Type_Table.csv',   revision: DATA_REV },
          { url: 'data/Exercise_Met.csv', revision: DATA_REV },
          { url: 'data/version.json',     revision: DATA_REV },
        ],

        runtimeCaching: [
          { urlPattern: ({url}) => url.pathname.endsWith('.csv'),
            handler: 'CacheFirst', options: { cacheName: 'csv-cache' } },
          { urlPattern: ({url}) => url.pathname.endsWith('version.json'),
            handler: 'StaleWhileRevalidate', options: { cacheName: 'meta-cache' } },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
})
