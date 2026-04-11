// public/sw.js
// Minimal service worker — enables "Add to Home Screen" on Android
const CACHE = 'alterlog-v2'

const SHELL_ASSETS = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
})

// Network-first strategy: always try network, fallback to cache
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return res
      })
      .catch(() =>
        caches.match(e.request).then((cached) => {
          if (cached) return cached
          // Offline fallback: serve cached home page for navigation requests
          if (e.request.mode === 'navigate') {
            return caches.match('/')
          }
        })
      )
  )
})
