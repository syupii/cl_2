import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SubscriptionDTO } from '@/lib/api-client'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Sentinel value stored in plan_name to mark a generic expense (non-subscription). */
export const EXPENSE_TAG = '__expense__'

/** Returns true if the item is a generic household expense (not a subscription). */
export function isExpense(sub: SubscriptionDTO): boolean {
  return sub.plan_name === EXPENSE_TAG
}

/** Returns true if the item is a subscription (not a generic expense). */
export function isSubscription(sub: SubscriptionDTO): boolean {
  return sub.plan_name !== EXPENSE_TAG
}

/** Returns true if the item is a one-time (non-recurring) expense. */
export function isOnceExpense(sub: SubscriptionDTO): boolean {
  return sub.billing_cycle === 'once'
}

/** Format a number (or numeric string) as Japanese yen. */
export function formatJPY(value: number | string | undefined): string {
  const num = typeof value === 'string' ? parseInt(value, 10) : (value ?? 0)
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(isNaN(num) ? 0 : num)
}

/** Format a date string (YYYY-MM-DD) as "M月D日". */
export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
  })
}

/** Days from today to a date string (YYYY-MM-DD). Negative = past. */
export function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}
