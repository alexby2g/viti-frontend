const CACHE = 'viti-shell-v22'
const APP_SHELL = ['/', '/index.html']

async function offlineResponse(request) {
  const exact = await caches.match(request)
  if (exact) return exact

  const shell = await caches.match('/index.html') || await caches.match('/')
  if (shell) return shell

  return new Response(
    '<!doctype html><html><body style="font-family:system-ui;padding:32px"><h1>VITI sin conexión</h1><p>No pudimos cargar esta pantalla. Revisa tu conexión e inténtalo nuevamente.</p></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).catch(() => undefined))
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
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response && response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put('/index.html', clone)).catch(() => undefined)
        }
        return response
      } catch {
        return offlineResponse(request)
      }
    })())
    return
  }

  const networkFirstAsset = /\.(?:js|css)$/.test(url.pathname)
  if (networkFirstAsset) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response && response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, clone)).catch(() => undefined)
        }
        return response
      } catch {
        return (await caches.match(request)) || new Response('', { status: 503, statusText: 'Offline' })
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached
    try {
      const response = await fetch(request)
      if (response && response.ok) {
        const clone = response.clone()
        caches.open(CACHE).then(cache => cache.put(request, clone)).catch(() => undefined)
      }
      return response
    } catch {
      return new Response('', { status: 503, statusText: 'Offline' })
    }
  })())
})
