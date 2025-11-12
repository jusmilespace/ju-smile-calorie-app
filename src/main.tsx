// 顯示有新版本可用時的提示（可選）
import { registerSW } from 'virtual:pwa-register'


const updateSW = registerSW({
  // 有新版本 → 跳提示；按下去就更新
  onNeedRefresh() {
    if (confirm('有新版本可以使用，是否立即更新？')) updateSW()
  },
  onOfflineReady() {
    console.log('App 已可離線使用')
  },
  // 可選：頁面載入就立刻註冊
  // immediate: true,
})

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

