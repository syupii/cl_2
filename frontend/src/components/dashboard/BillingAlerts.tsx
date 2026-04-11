'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import type { SubscriptionDTO } from '@/lib/api-client'

/** Days ahead to warn about upcoming billing. */
const WARN_DAYS = 7

function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  return diff
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
  })
}

/** Request notification permission and fire a browser notification. */
function fireBrowserNotification(subs: SubscriptionDTO[]) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  subs.forEach((s) => {
    const days = daysUntil(s.next_billing_date)
    if (days === null) return
    const label =
      days === 0 ? '本日' : days < 0 ? `${Math.abs(days)}日超過` : `${days}日後`
    new Notification(`💳 ${s.service_name} の請求日が近づいています`, {
      body: `次回請求日: ${formatDate(s.next_billing_date)}（${label}）`,
      tag: `billing-${s.id}`,
    })
  })
}

export function BillingAlerts() {
  const { data: subs = [] } = useSubscriptions()
  const [dismissed, setDismissed] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')

  // Upcoming = active subscriptions with next_billing_date within WARN_DAYS (including overdue)
  const upcoming = subs.filter((s) => {
    if (s.status !== 'active') return false
    const days = daysUntil(s.next_billing_date)
    return days !== null && days <= WARN_DAYS
  }).sort((a, b) => {
    const da = daysUntil(a.next_billing_date) ?? 999
    const db = daysUntil(b.next_billing_date) ?? 999
    return da - db
  })

  // Read current permission state on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission)
    }
  }, [])

  // Fire browser notifications once per session when data loads
  useEffect(() => {
    if (upcoming.length === 0) return
    const key = 'billing_notif_fired'
    if (sessionStorage.getItem(key)) return
    if (Notification.permission === 'granted') {
      fireBrowserNotification(upcoming)
      sessionStorage.setItem(key, '1')
    }
  }, [upcoming.length]) // eslint-disable-line react-hooks/exhaustive-deps

  async function requestPermission() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
    if (perm === 'granted' && upcoming.length > 0) {
      fireBrowserNotification(upcoming)
      sessionStorage.setItem('billing_notif_fired', '1')
    }
  }

  if (upcoming.length === 0) return null
  if (dismissed) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-start gap-3 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              請求日が近いサブスクリプション（{upcoming.length}件）
            </p>
            <div className="flex items-center gap-1">
              {/* Browser notification toggle */}
              {notifPermission !== 'denied' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-amber-700 hover:text-amber-900 dark:text-amber-400"
                  title={notifPermission === 'granted' ? 'ブラウザ通知: オン' : 'ブラウザ通知を有効にする'}
                  onClick={requestPermission}
                >
                  {notifPermission === 'granted' ? (
                    <Bell className="h-3.5 w-3.5" />
                  ) : (
                    <BellOff className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-amber-700 hover:text-amber-900 dark:text-amber-400"
                title="閉じる"
                onClick={() => setDismissed(true)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <ul className="space-y-1">
            {upcoming.map((s) => {
              const days = daysUntil(s.next_billing_date)
              const isOverdue = days !== null && days < 0
              const isToday = days === 0
              return (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-amber-900 dark:text-amber-200">
                    {s.service_name}
                    {s.plan_name && (
                      <span className="ml-1 text-xs font-normal text-amber-700 dark:text-amber-400">
                        ({s.plan_name})
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      isOverdue
                        ? 'text-xs font-semibold text-red-600 dark:text-red-400'
                        : isToday
                        ? 'text-xs font-semibold text-orange-600 dark:text-orange-400'
                        : 'text-xs text-amber-700 dark:text-amber-400'
                    }
                  >
                    {formatDate(s.next_billing_date)}
                    {isOverdue && ` (${Math.abs(days!)}日超過)`}
                    {isToday && ' (本日)'}
                    {!isOverdue && !isToday && days !== null && ` (${days}日後)`}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
