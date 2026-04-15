'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Proactively ask the browser to re-check sw.js. iOS Safari can
        // otherwise serve the same cached SW script for days and keep users
        // stuck on an older (buggy) version.
        registration.update().catch(() => {})
      })
      .catch(() => {
        // Service worker registration failed — app still works normally.
      })
  }, [])

  return null
}
