'use client'

import { useEffect, useState, useCallback } from 'react'
import { STORAGE_KEYS } from '@/lib/constants'

export function useCategories() {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PREDEFINED_CATEGORIES)
      if (saved) setCategories(JSON.parse(saved) as string[])
    } catch {
      // ignore parse errors
    }
  }, [])

  const persist = useCallback((next: string[]) => {
    setCategories(next)
    localStorage.setItem(STORAGE_KEYS.PREDEFINED_CATEGORIES, JSON.stringify(next))
  }, [])

  const addCategory = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      persist([...new Set([...categories, trimmed])].sort())
    },
    [categories, persist]
  )

  const removeCategory = useCallback(
    (name: string) => {
      persist(categories.filter((c) => c !== name))
    },
    [categories, persist]
  )

  return { categories, addCategory, removeCategory }
}
