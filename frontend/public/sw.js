// Service Worker kill switch.
//
// Past revisions of this file installed a SW that intercepted navigations and
// precached HTML shells. On iPhone Safari that combination produced the
// dreaded "このページを読み込めませんでした / This page couldn't load"
// reload error, because cached HTML disagreed with the live auth state.
//
// To unstick any user still carrying an old SW we ship a tiny SW whose
// entire purpose is to unregister itself and delete every cache. Browsers
// re-fetch sw.js on navigation (and we force no-cache on the response), so
// every returning user runs through this self-destruct exactly once.
//
// Once this SW unregisters, the browser handles all requests natively, which
// is exactly what we want.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete every Cache Storage entry we might have created in prior
      // revisions.
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))

      // Unregister ourselves so future navigations bypass the SW layer.
      await self.registration.unregister()

      // Reload controlled clients so they stop talking to this dying SW.
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        // Best-effort; ignore failures from clients that no longer accept
        // postMessage or navigate().
        try {
          client.navigate(client.url)
        } catch {
          /* noop */
        }
      }
    })(),
  )
})

// Never intercept fetches. Let the browser handle everything natively.
self.addEventListener('fetch', () => {})
