// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ju-smile-calorie-app/',   // ⭐ 一定保留，對應 GitHub Pages 子路徑
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',   // 回到頁面自動抓新版本
      manifest: false,              // 我們已用 public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      // 讓你在開發模式也能看到 SW（可選，但新手友善）
      devOptions: {
        enabled: true
      }
    })
  ]
})
