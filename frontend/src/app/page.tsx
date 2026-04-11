'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const hash = window.location.hash

    // Supabase password recovery redirects here when /reset-password is not whitelisted.
    // Preserve the code/hash and forward to the correct page.
    if (code) {
      router.replace(`/reset-password?code=${code}`)
      return
    }
    if (hash.includes('type=recovery')) {
      router.replace(`/reset-password${hash}`)
      return
    }

    router.replace('/dashboard')
  }, [router])

  // Blank while detecting — avoid flash
  return null
}
