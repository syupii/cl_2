import { STORAGE_KEYS } from './constants'

/** Reads the monthly budget from localStorage. Returns null if not set. */
export function loadBudget(): number | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEYS.MONTHLY_BUDGET)
  if (!raw) return null
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}
