'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ServiceIcon } from '@/components/ui/service-icon'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useClickOutside } from '@/hooks/useClickOutside'
import { formatDate, daysUntil, isExpense } from '@/lib/utils'
import { STORAGE_KEYS } from '@/lib/constants'

const DEFAULT_WARN_DAYS = 7
const DEFAULT_TRIAL_WARN_DAYS = 3

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
  const [trialWarnDays, setTrialWarnDays] = useState(DEFAULT_TRIAL_WARN_DAYS)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDismissed(loadDismissed())
    const n = parseInt(localStorage.getItem(STORAGE_KEYS.BILLING_ALERT_DAYS) ?? '', 10)
    setWarnDays(isNaN(n) || n < 1 ? DEFAULT_WARN_DAYS : n)
    const tn = parseInt(localStorage.getItem(STORAGE_KEYS.TRIAL_ALERT_DAYS) ?? '', 10)
    setTrialWarnDays(isNaN(tn) || tn < 1 ? DEFAULT_TRIAL_WARN_DAYS : tn)
  }, [])

  useClickOutside(ref, () => setOpen(false), open)

  // Billing notifications
  const billingNotifications = subs
    .filter((s) => s.status === 'active' && !isExpense(s))
    .map((s) => ({ sub: s, days: daysUntil(s.next_billing_date), type: 'billing' as const }))
    .filter(({ days }) => days !== null && days <= warnDays)

  // Trial ending notifications
  const trialNotifications = subs
    .filter((s) => s.status === 'active' && !!s.trial_end_date)
    .map((s) => ({ sub: s, days: daysUntil(s.trial_end_date), type: 'trial' as const }))
    .filter(({ days }) => days !== null && days >= 0 && days <= trialWarnDays)

  // Merge and sort by days ascending
  const notifications = [...billingNotifications, ...trialNotifications]
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))

  // Dismissed key: for billing = next_billing_date, for trial = trial_end_date + ':trial'
  function dismissedKey(type: 'billing' | 'trial', sub: typeof subs[number]) {
    return type === 'trial'
      ? `${sub.id}:trial`
      : sub.id!
  }
  function dismissedValue(type: 'billing' | 'trial', sub: typeof subs[number]) {
    return type === 'trial'
      ? (sub.trial_end_date ?? '')
      : (sub.next_billing_date ?? '')
  }

  const unread = notifications.filter(({ sub, type }) =>
    dismissed[dismissedKey(type, sub)] !== dismissedValue(type, sub)
  )

  function dismissOne(type: 'billing' | 'trial', sub: typeof subs[number]) {
    const key = dismissedKey(type, sub)
    const val = dismissedValue(type, sub)
    const next = { ...dismissed, [key]: val }
    setDismissed(next)
    localStorage.setItem(STORAGE_KEYS.NOTIF_DISMISSED, JSON.stringify(next))
  }

  function dismissAll() {
    const next = { ...dismissed }
    notifications.forEach(({ sub, type }) => {
      next[dismissedKey(type, sub)] = dismissedValue(type, sub)
    })
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
                今後の請求・トライアル終了はありません
              </p>
            ) : (
              notifications.map(({ sub, days, type }) => {
                const key = `${sub.id}-${type}`
                const isRead = dismissed[dismissedKey(type, sub)] === dismissedValue(type, sub)
                const isTrial = type === 'trial'
                const dateStr = isTrial ? sub.trial_end_date : sub.next_billing_date
                const isOverdue = !isTrial && (days ?? 0) < 0
                const isToday = days === 0
                return (
                  <div
                    key={key}
                    className={`flex items-start gap-3 border-b px-4 py-3 last:border-0 ${isRead ? 'opacity-50' : 'bg-accent/30'}`}
                  >
                    <ServiceIcon serviceName={sub.service_name} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        {isTrial && <Clock className="h-3 w-3 shrink-0 text-violet-500" />}
                        <p className="truncate text-sm font-medium">{sub.service_name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isTrial ? 'トライアル終了: ' : ''}{formatDate(dateStr)}
                        {isOverdue && <span className="ml-1 font-semibold text-destructive">({Math.abs(days!)}日超過)</span>}
                        {isToday && <span className="ml-1 font-semibold text-orange-500">{isTrial ? '(本日終了)' : '(本日)'}</span>}
                        {!isOverdue && !isToday && days !== null && (
                          <span className="ml-1">({days}日後{isTrial ? 'に終了' : ''})</span>
                        )}
                      </p>
                    </div>
                    {!isRead && (
                      <>
                        <button
                          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => dismissOne(type, sub)}
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
