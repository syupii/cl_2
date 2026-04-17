import { STORAGE_KEYS } from './constants'

/** Reads the monthly budget from localStorage. Returns null if not set. */
export function loadBudget(): number | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEYS.MONTHLY_BUDGET)
  if (!raw) return null
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}

const STRING_LIST_MAX_ITEMS = 200
const STRING_LIST_MAX_ITEM_LEN = 100

/**
 * Defense-in-depth reader for JSON string arrays in localStorage.
 * Rejects anything that isn't an array of short strings so tampered or
 * malformed storage (e.g. via another tab or DevTools) can't poison the UI.
 */
export function loadStringList(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const out: string[] = []
    for (const item of parsed) {
      if (typeof item !== 'string') continue
      if (item.length === 0 || item.length > STRING_LIST_MAX_ITEM_LEN) continue
      out.push(item)
      if (out.length >= STRING_LIST_MAX_ITEMS) break
    }
    return out
  } catch {
    return []
  }
}
