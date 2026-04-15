// Service Worker for サブスク管理ダッシュボード
// Strategy:
//   - Static/page assets → cache-first (install-time pre-cache)
//   - API calls (backend) → network-first, cache fallback (read-only offline)
//   - Next.js build assets (_next/static) → cache-first

// Bump the version whenever sw.js logic changes so returning clients pick
// up the new SW immediately (old caches are purged in the activate step).
const CACHE_VERSION = 'v2'
const STATIC_CACHE = `subscrip-static-${CACHE_VERSION}`
const API_CACHE = `subscrip-api-${CACHE_VERSION}`
const ALL_CACHES = [STATIC_CACHE, API_CACHE]

// Pages to pre-cache on install. Any /dashboard/* route should be listed
// here so that an iOS Safari reload on those pages can always fall back to
// a cached shell if the network fetch fails or returns an error response.
const PRECACHE_URLS = [
  '/dashboard',
  '/dashboard/subscriptions',
  '/dashboard/budget',
  '/dashboard/calendar',
  '/login',
]

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
    // Only cache successful, basic (non-opaque, non-redirected) responses.
    // iOS Safari occasionally chokes on cached redirects when reloading.
    if (response.ok && response.type === 'basic' && !response.redirected) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone()).catch(() => {
        // put() can reject on iOS for partial/opaque responses — ignore.
      })
    }
    return response
  } catch {
    // Network failed (flaky mobile connection, iOS Safari backgrounding,
    // etc.). Try cache for this exact page first, then fall back to the
    // pre-cached SPA shells so the user sees something instead of Safari's
    // "this page couldn't load" error. Re-throwing / re-fetching here is
    // what caused the reload failure on iPhone.
    const cached = await caches.match(request)
    if (cached) return cached

    const dashboardShell = await caches.match('/dashboard')
    if (dashboardShell) return dashboardShell

    const loginShell = await caches.match('/login')
    if (loginShell) return loginShell

    return new Response(
      '<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<title>オフライン</title></head><body style="font-family:sans-serif;padding:2rem;">'
        + '<h1>オフラインです</h1>'
        + '<p>ネットワーク接続を確認して、もう一度お試しください。</p>'
        + '</body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
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
