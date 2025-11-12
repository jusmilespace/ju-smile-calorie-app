import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const DATA_REV = '2025-11-12-2145' // ← 換新字串

export default defineConfig({
  base: '/ju-smile-calorie-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      filename: 'sw.js',
      injectRegister: null,
      manifest: false,
      workbox: {
        // ❗ 不要掃 csv/json
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // ❗ 只列 data/ 路徑（不要根目錄）
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
