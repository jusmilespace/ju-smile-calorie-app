// 顯示有新版本可用時的提示（可選）
import { registerSW } from 'virtual:pwa-register'

registerSW({
  onNeedRefresh() {
    if (confirm('有新版本可以使用，是否立即更新？')) {
      // 會呼叫 skipWaiting 並重新載入
      location.reload()
    }
  },
  onOfflineReady() {
    console.log('App 已可離線使用')
  }
})

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

