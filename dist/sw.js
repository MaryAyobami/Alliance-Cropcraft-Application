const CACHE_NAME = 'alliance-cropcraft-v1'

// Install event - minimal caching for development
self.addEventListener('install', event => {
  console.log('Service Worker installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cache opened')
      // Only cache essential files that definitely exist
      return cache.addAll([
        '/',
        '/manifest.json'
      ]).catch(error => {
        console.log('Cache addAll failed:', error)
        // Don't fail the install if caching fails in development
        return Promise.resolve()
      })
    }).then(() => {
      self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      self.clients.claim()
    })
  )
})

// Fetch event - network first for development
self.addEventListener('fetch', event => {
  // Skip non-http requests
  if (!event.request.url.startsWith('http')) {
    return
  }

  // Skip Chrome extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then(response => {
          if (response) {
            return response
          }
          // For navigation requests, return index.html from cache
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
          return new Response('Offline', { status: 503 })
        })
      })
  )
})

self.addEventListener('push', event => {
  const data = event.data.json()
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon || './ms-icon-150x150.png'
  })
})