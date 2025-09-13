/**
 * Alliance CropCraft - Service Worker
 * Handles offline functionality, caching, and background sync
 */

const CACHE_NAME = 'alliance-cropcraft-v1.0'
const API_CACHE_NAME = 'alliance-cropcraft-api-v1.0'

// Resources to cache for offline use
const STATIC_RESOURCES = [
  '/',
  '/login',
  '/dashboard',
  '/livestock',
  '/tasks',
  '/manifest.json',
  '/logo.png',
  // Add other critical assets
]

// API endpoints that should be cached
const CACHEABLE_API_PATTERNS = [
  /\/api\/livestock/,
  /\/api\/users/,
  /\/api\/pens/,
  /\/api\/dashboard/,
  /\/api\/weight-records/,
  /\/api\/health-summary/
]

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install event')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static resources')
        return cache.addAll(STATIC_RESOURCES)
      })
      .catch((error) => {
        console.error('[ServiceWorker] Failed to cache static resources:', error)
      })
  )
  
  // Force activation of new service worker
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate event')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
  )
  
  // Take control of all pages immediately
  self.clients.claim()
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request))
    return
  }

  // Handle static resources
  event.respondWith(handleStaticRequest(request))
})

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const url = new URL(request.url)
  const shouldCache = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname))
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // Cache successful GET responses for cacheable endpoints
    if (shouldCache && networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[ServiceWorker] Network failed for API request, trying cache:', url.pathname)
    
    // If network fails, try cache
    if (shouldCache) {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        console.log('[ServiceWorker] Serving API request from cache:', url.pathname)
        return cachedResponse
      }
    }
    
    // Return offline response for critical endpoints
    if (url.pathname.includes('/dashboard/') || url.pathname.includes('/livestock')) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'This data is not available offline. Please connect to the internet.',
          offline: true
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    throw error
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // If not in cache, fetch from network
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[ServiceWorker] Both cache and network failed for:', request.url)
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      const offlineResponse = await caches.match('/offline.html')
      return offlineResponse || new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Alliance CropCraft - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .offline-container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .offline-icon { font-size: 48px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin-bottom: 20px; }
            .retry-btn { background: #16a34a; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; }
            .retry-btn:hover { background: #15803d; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1>You're Offline</h1>
            <p>Alliance CropCraft is not available right now. Please check your internet connection.</p>
            <button class="retry-btn" onclick="location.reload()">Try Again</button>
          </div>
        </body>
        </html>
        `,
        {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }
    
    throw error
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync event:', event.tag)
  
  if (event.tag === 'alliance-cropcraft-sync') {
    event.waitUntil(performBackgroundSync())
  }
})

// Perform background sync when connection is restored
async function performBackgroundSync() {
  try {
    console.log('[ServiceWorker] Performing background sync')
    
    // Notify all clients to trigger their sync
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        payload: { trigger: 'connection_restored' }
      })
    })
    
    console.log('[ServiceWorker] Background sync completed')
  } catch (error) {
    console.error('[ServiceWorker] Background sync failed:', error)
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push event received')
  
  const options = {
    body: 'You have new updates in Alliance CropCraft',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/logo.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/logo.png'
      }
    ]
  }
  
  if (event.data) {
    const data = event.data.json()
    options.body = data.body || options.body
    options.title = data.title || 'Alliance CropCraft'
  }
  
  event.waitUntil(
    self.registration.showNotification('Alliance CropCraft', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked')
  
  event.notification.close()
  
  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    )
  } else if (event.action === 'close') {
    // Just close the notification
    return
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.payload
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(urls))
    )
  }
})

// Error handling
self.addEventListener('error', (event) => {
  console.error('[ServiceWorker] Error:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('[ServiceWorker] Unhandled promise rejection:', event.reason)
})

console.log('[ServiceWorker] Service worker script loaded')