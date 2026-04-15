'use client'

import { useEffect } from 'react'

/**
 * Formerly registered a Service Worker. We have now disabled SW usage
 * entirely because past SW revisions caused iPhone Safari to hit
 * "このページを読み込めませんでした" on reload when the cached HTML shell
 * disagreed with live auth state.
 *
 * This component now only *unregisters* any leftover SW from prior visits
 * and clears related caches. Combined with the self-destructing `/sw.js`
 * kill-switch script, every returning device drops back to plain browser
 * behaviour on the next visit.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const reg of regs) {
          reg.unregister().catch(() => {
            /* noop — unregister is best-effort */
          })
        }
      })
      .catch(() => {
        /* noop */
      })

    if (typeof caches !== 'undefined') {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {
          /* noop */
        })
    }
  }, [])

  return null
}
