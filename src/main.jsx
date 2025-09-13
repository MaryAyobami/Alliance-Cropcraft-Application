import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initOfflineSync } from './services/offlineSync'

// // Register service worker for PWA
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js')
//   })
// }


// Service Worker Registration with Offline Sync
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('[Main] Service Worker registered successfully:', registration.scope)
      
      // Initialize offline sync system
      await initOfflineSync()
      console.log('[Main] Offline sync initialized')
      
      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'BACKGROUND_SYNC') {
          console.log('[Main] Background sync triggered by service worker')
          // Trigger sync in offline sync service
          import('./services/offlineSync').then(({ syncPendingCalls }) => {
            syncPendingCalls()
          })
        }
      })
      
    } catch (error) {
      console.error('[Main] Service Worker registration failed:', error)
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)