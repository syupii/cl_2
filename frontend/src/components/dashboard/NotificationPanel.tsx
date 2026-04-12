'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useClickOutside } from '@/hooks/useClickOutside'
import { formatDate, daysUntil } from '@/lib/utils'
import { STORAGE_KEYS } from '@/lib/constants'

const DEFAULT_WARN_DAYS = 30

function loadDismissed(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIF_DISMISSED) ?? '{}')
  } catch {
    return {}
  }
}

export function NotificationPanel() {
  const { data: subs = [] } = useSubscriptions()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<Record<string, string>>({})
  const [warnDays, setWarnDays] = useState(DEFAULT_WARN_DAYS)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDismissed(loadDismissed())
    // BillingAlerts と同じ設定値を使う
    const n = parseInt(localStorage.getItem(STORAGE_KEYS.BILLING_ALERT_DAYS) ?? '', 10)
    setWarnDays(isNaN(n) || n < 1 ? DEFAULT_WARN_DAYS : n)
  }, [])

  useClickOutside(ref, () => setOpen(false), open)

  const notifications = subs
    .filter((s) => s.status === 'active')
    .map((s) => ({ sub: s, days: daysUntil(s.next_billing_date) }))
    .filter(({ days }) => days !== null && days <= warnDays)
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))

  const unread = notifications.filter(({ sub }) => dismissed[sub.id!] !== sub.next_billing_date)

  function dismissOne(id: string, date: string) {
    const next = { ...dismissed, [id]: date }
    setDismissed(next)
    localStorage.setItem(STORAGE_KEYS.NOTIF_DISMISSED, JSON.stringify(next))
  }

  function dismissAll() {
    const next = { ...dismissed }
    notifications.forEach(({ sub }) => { next[sub.id!] = sub.next_billing_date ?? '' })
    setDismissed(next)
    localStorage.setItem(STORAGE_KEYS.NOTIF_DISMISSED, JSON.stringify(next))
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost" size="icon"
        onClick={() => setOpen((v) => !v)}
        className="relative"
        title="通知"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed right-4 top-14 z-50 w-[calc(100vw-2rem)] max-w-80 rounded-lg border bg-popover shadow-lg sm:absolute sm:right-0 sm:top-10 sm:w-80">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">通知</p>
            {unread.length > 0 && (
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={dismissAll}>
                すべて既読にする
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                今後{warnDays}日以内の請求はありません
              </p>
            ) : (
              notifications.map(({ sub, days }) => {
                const isRead = dismissed[sub.id!] === sub.next_billing_date
                const isOverdue = (days ?? 0) < 0
                const isToday = days === 0
                return (
                  <div
                    key={sub.id}
                    className={`flex items-start gap-3 border-b px-4 py-3 last:border-0 ${isRead ? 'opacity-50' : 'bg-accent/30'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{sub.service_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(sub.next_billing_date)}
                        {isOverdue && <span className="ml-1 font-semibold text-destructive">({Math.abs(days!)}日超過)</span>}
                        {isToday && <span className="ml-1 font-semibold text-orange-500">(本日)</span>}
                        {!isOverdue && !isToday && days !== null && <span className="ml-1">({days}日後)</span>}
                      </p>
                    </div>
                    {!isRead && (
                      <>
                        <button
                          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => dismissOne(sub.id!, sub.next_billing_date ?? '')}
                        >
                          既読
                        </button>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">NEW</Badge>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
