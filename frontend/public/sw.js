// Service Worker for サブスク管理ダッシュボード
// Strategy:
//   - Static/page assets → cache-first (install-time pre-cache)
//   - API calls (backend) → network-first, cache fallback (read-only offline)
//   - Next.js build assets (_next/static) → cache-first

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `subscrip-static-${CACHE_VERSION}`
const API_CACHE = `subscrip-api-${CACHE_VERSION}`
const ALL_CACHES = [STATIC_CACHE, API_CACHE]

// Pages to pre-cache on install
const PRECACHE_URLS = ['/dashboard', '/login']

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Ignore pre-cache failures (e.g., auth-gated pages returning 3xx)
      })
    )
  )
  self.skipWaiting()
})

// ── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !ALL_CACHES.includes(k))
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET requests
  if (request.method !== 'GET') return

  // Skip chrome-extension and non-http(s) URLs
  if (!url.protocol.startsWith('http')) return

  // Backend API → network-first, fall back to cache for offline reading
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstAPI(request))
    return
  }

  // Next.js static chunks → cache-first (immutable hashed filenames)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirstStatic(request))
    return
  }

  // Page navigations → network-first, fall back to cached page
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
    return
  }

  // Other same-origin assets (images, fonts) → cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstStatic(request))
  }
})

// ── Strategies ───────────────────────────────────────────────────────────────

async function networkFirstAPI(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(
      JSON.stringify({ error: 'offline', message: 'オフラインのため取得できません' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? fetch(request)
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('', { status: 408 })
  }
}
