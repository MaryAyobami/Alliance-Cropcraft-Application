self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  // Only cache http(s) requests
  if (!event.request.url.startsWith('http')) {
    return
  }
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