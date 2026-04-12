'use client'

import { useEffect, useState, useCallback } from 'react'

const CATS_KEY = 'predefined_categories'

export function useCategories() {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CATS_KEY)
      if (saved) setCategories(JSON.parse(saved) as string[])
    } catch {
      // ignore parse errors
    }
  }, [])

  const persist = useCallback((next: string[]) => {
    setCategories(next)
    localStorage.setItem(CATS_KEY, JSON.stringify(next))
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
