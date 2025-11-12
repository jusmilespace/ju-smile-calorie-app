// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const DATA_REV = '2025-11-12-2158' // ← 每次改資料就換一個新字串

export default defineConfig({
  // GitHub Pages 子路徑（一定要正確）
  base: '/ju-smile-calorie-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',     // 回到頁面提示更新
      filename: 'sw.js',          // 固定 service worker 檔名
      injectRegister: null,       // 你在 main.tsx 用 virtual:pwa-register 註冊，這裡就不再注入
      manifest: false,            // 使用 public/manifest.json
      workbox: {
        // ❗ 不要把 csv/json 放進自動掃描，避免重複/衝突
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // ❗ 只把 /data/ 底下的檔案放進預快取
        additionalManifestEntries: [
          { url: 'data/Food_DB.csv',      revision: DATA_REV },
          { url: 'data/Unit_Map.csv',     revision: DATA_REV },
          { url: 'data/Type_Table.csv',   revision: DATA_REV },
          { url: 'data/Exercise_Met.csv', revision: DATA_REV },
          { url: 'data/version.json',     revision: DATA_REV },
{ url: 'manifest.webmanifest', revision: '2025-11-12-2208' },

        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.csv'),
            handler: 'CacheFirst',
            options: { cacheName: 'csv-cache' }
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith('version.json'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'meta-cache' }
          }
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
})
