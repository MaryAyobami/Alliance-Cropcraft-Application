self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  self.clients.claim()
})

// Simple offline cache (optional)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open('livestock-cache').then(cache => {
      return cache.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
          cache.put(event.request, networkResponse.clone())
          return networkResponse
        })
      })
    })
  )
})