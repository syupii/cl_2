// Service Worker for サブスク管理ダッシュボード
//
// Scope:
//   - /_next/static/  → cache-first (immutable hashed filenames)
//   - /api/*          → network-first, cache fallback for offline reads
//
// We intentionally do NOT intercept navigation requests (HTML pages).
// iOS Safari has a long history of showing "このページを読み込めませんでした"
// when a SW returns a cached HTML shell that disagrees with the actual auth
// state (Supabase stores the session in localStorage, so the precached shell
// doesn't know whether the user is still logged in). Letting the browser
// handle navigations natively eliminates that class of bugs entirely.
//
// Bump CACHE_VERSION when this file changes so old SWs (and their caches)
// are replaced on the next visit.

const CACHE_VERSION = 'v3'
const STATIC_CACHE = `subscrip-static-${CACHE_VERSION}`
const API_CACHE = `subscrip-api-${CACHE_VERSION}`
const ALL_CACHES = [STATIC_CACHE, API_CACHE]

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', () => {
  // Nothing to pre-cache: hashed /_next/static/* assets get cached lazily on
  // first fetch, and pre-caching auth-gated HTML was the root cause of the
  // iOS reload failure.
  self.skipWaiting()
})

// ── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET; everything else goes through natively.
  if (request.method !== 'GET') return

  // Skip chrome-extension and non-http(s) URLs.
  if (!url.protocol.startsWith('http')) return

  // CRITICAL: do NOT intercept page navigations. Returning a stale cached
  // shell when the user's auth state has changed is what triggers iOS
  // Safari's "この ページを読み込めませんでした" on reload.
  if (request.mode === 'navigate') return

  // Backend API → network-first, fall back to cache for offline reading.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstAPI(request))
    return
  }

  // Next.js hashed static chunks → cache-first (content-addressed filenames).
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirstStatic(request))
    return
  }

  // Other same-origin assets (images, fonts) → cache-first.
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
      // cache.put can reject on iOS for some response shapes (opaque, partial).
      // Never let that bubble up and break the response delivery.
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(
      JSON.stringify({ error: 'offline', message: 'オフラインのため取得できません' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch {
    return new Response('', { status: 408 })
  }
}
