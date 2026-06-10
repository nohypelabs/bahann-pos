// LakuPOS Service Worker
// Caching strategies for offline POS support

const CACHE_NAME = 'lakupos-v1'
const STATIC_CACHE = 'lakupos-static-v1'
const DYNAMIC_CACHE = 'lakupos-dynamic-v1'
const API_CACHE = 'lakupos-api-v1'

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/pos/sales',
  '/dashboard',
  '/offline',
]

// Install event - pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Some URLs may fail in dev, that's ok
      })
    }).then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!validCaches.includes(name)) {
            return caches.delete(name)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - different strategies per request type
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith('http')) return

  // tRPC queries: Network-first with cache fallback
  if (url.pathname.startsWith('/api/trpc/')) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // Static assets (JS, CSS, fonts, images): Cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // HTML pages: Network-first with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE))
    return
  }

  // Everything else: Network-first
  event.respondWith(networkFirst(request, DYNAMIC_CACHE))
})

// Strategy: Cache-first (for static assets)
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

// Strategy: Network-first (for dynamic content)
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    // For HTML requests, return offline page
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/') || new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    return new Response('Offline', { status: 503 })
  }
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  return /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico|mp3|mp4)$/.test(pathname)
    || pathname.startsWith('/_next/static/')
    || pathname.startsWith('/icons/')
    || pathname.startsWith('/favicon')
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  // Cache invalidation from client
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      Promise.all(names.map((name) => caches.delete(name)))
    })
  }
})
