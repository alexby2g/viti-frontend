const CACHE = 'viti-shell-v21'
const APP_SHELL = ['/', '/index.html']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/') || url.pathname.startsWith('/storage/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put('/', clone)).catch(() => {})
          return response
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/')) || (await caches.match('/index.html')))
    )
    return
  }

  const networkFirstAsset = /\.(?:js|css)$/.test(url.pathname)
  if (networkFirstAsset) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE).then(cache => cache.put(request, clone)).catch(() => {})
          }
          return response
        })
        .catch(async () => (await caches.match(request)) || Response.error())
    )
    return
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone()
        caches.open(CACHE).then(cache => cache.put(request, clone)).catch(() => {})
      }
      return response
    }))
  )
})
