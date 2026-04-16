'use client'

import { useState, useEffect } from 'react'
import { guessIconUrl } from '@/lib/serviceIcon'

interface Props {
  serviceName: string | undefined | null
  size?: number
  className?: string
}

export function ServiceIcon({ serviceName, size = 32, className }: Props) {
  const [errored, setErrored] = useState(false)
  // serviceName が変わったらエラー状態をリセット
  useEffect(() => {
    setErrored(false)
  }, [serviceName])

  const url = guessIconUrl(serviceName, size * 2)

  if (!url || errored) {
    const initial = serviceName?.trim().charAt(0).toUpperCase() ?? '?'
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground ${className ?? ''}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {initial}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErrored(true)}
      className={`shrink-0 rounded-md ${className ?? ''}`}
      aria-hidden="true"
    />
  )
}
