import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const BASE = '/ju-smile-calorie-app/'
const DATA_REV = '2025-11-12-1630'  // ← 每次更新資料就改

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',   // 搭配你 main.tsx 的 onNeedRefresh
      manifest: false,          // 用 public/manifest.json
      workbox: {
        // 讓 csv/json 也能被掃描（保險起見）
        globPatterns: ['**/*.{js,css,html,ico,png,svg,csv,json}'],
        // ⬇️ 關鍵：把 /data/ 的 5 個檔案「明確」加進 precache
        // ✅ 用相對路徑 'data/...'(建議)；Workbox 會自動套 scope
        additionalManifestEntries: [
          { url: 'data/Food_DB.csv',      revision: DATA_REV },
          { url: 'data/Unit_Map.csv',     revision: DATA_REV },
          { url: 'data/Type_Table.csv',   revision: DATA_REV },
          { url: 'data/Exercise_Met.csv', revision: DATA_REV },
          { url: 'data/version.json',     revision: DATA_REV },
        ],
        runtimeCaching: [
          { urlPattern: ({url}) => url.pathname.endsWith('.csv'),
            handler: 'CacheFirst',
            options: { cacheName: 'csv-cache' } },
          { urlPattern: ({url}) => url.pathname.endsWith('version.json'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'meta-cache' } },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
})
