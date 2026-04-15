'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, BellOff, X, AlertTriangle, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { formatDate, daysUntil, isExpense, EXPENSE_TAG } from '@/lib/utils'
import { STORAGE_KEYS } from '@/lib/constants'
import type { SubscriptionDTO } from '@/lib/api-client'

const DEFAULT_DAYS = 7

function getDays(): number {
  if (typeof window === 'undefined') return DEFAULT_DAYS
  const n = parseInt(localStorage.getItem(STORAGE_KEYS.BILLING_ALERT_DAYS) ?? '', 10)
  return isNaN(n) || n < 1 ? DEFAULT_DAYS : n
}

function fireBrowserNotification(subs: SubscriptionDTO[]) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  subs.forEach((s) => {
    const days = daysUntil(s.next_billing_date)
    if (days === null) return
    const label = days === 0 ? '本日' : days < 0 ? `${Math.abs(days)}日超過` : `${days}日後`
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
  const [warnDays, setWarnDays] = useState(DEFAULT_DAYS)
  const [editingDays, setEditingDays] = useState(false)
  const [daysInput, setDaysInput] = useState(String(DEFAULT_DAYS))

  useEffect(() => {
    const saved = getDays()
    setWarnDays(saved)
    setDaysInput(String(saved))
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission)
    }
  }, [])

  // subs / warnDays が変わったときだけ再計算する。useMemo を外すと、
  // upcoming が毎レンダーで新しい配列参照になり、下の useEffect が
  // 依存配列 (.length だけ) で取りこぼす closure のせいで通知が
  // 古い参照で発火し、iOS Safari では再レンダー連鎖で heap を食い潰す。
  const upcoming = useMemo(
    () =>
      subs
        .filter((s) => {
          if (s.status !== 'active') return false
          if (isExpense(s)) return false
          const d = daysUntil(s.next_billing_date)
          return d !== null && d <= warnDays
        })
        .sort(
          (a, b) =>
            (daysUntil(a.next_billing_date) ?? 999) - (daysUntil(b.next_billing_date) ?? 999),
        ),
    [subs, warnDays],
  )

  // Fire browser notification once per session when there are upcoming bills
  useEffect(() => {
    if (upcoming.length === 0) return
    const key = 'billing_notif_fired'
    if (sessionStorage.getItem(key)) return
    if (Notification.permission === 'granted') {
      fireBrowserNotification(upcoming)
      sessionStorage.setItem(key, '1')
    }
  }, [upcoming])

  async function requestPermission() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
    if (perm === 'granted' && upcoming.length > 0) {
      fireBrowserNotification(upcoming)
      sessionStorage.setItem('billing_notif_fired', '1')
    }
  }

  function saveDays() {
    const n = parseInt(daysInput, 10)
    if (!isNaN(n) && n >= 1) {
      localStorage.setItem(STORAGE_KEYS.BILLING_ALERT_DAYS, String(n))
      setWarnDays(n)
    }
    setEditingDays(false)
  }

  if (dismissed || (upcoming.length === 0 && !editingDays)) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {editingDays ? 'アラート日数を設定' : `請求日が近いサブスクリプション（${upcoming.length}件）`}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-amber-700 hover:text-amber-900 dark:text-amber-400"
                title="アラート日数を設定"
                onClick={() => setEditingDays((v) => !v)}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
              {notifPermission !== 'denied' && (
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-amber-700 hover:text-amber-900 dark:text-amber-400"
                  title={notifPermission === 'granted' ? 'ブラウザ通知: オン' : 'ブラウザ通知を有効にする'}
                  onClick={requestPermission}
                >
                  {notifPermission === 'granted'
                    ? <Bell className="h-3.5 w-3.5" />
                    : <BellOff className="h-3.5 w-3.5" />}
                </Button>
              )}
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-amber-700 hover:text-amber-900 dark:text-amber-400"
                onClick={() => setDismissed(true)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {editingDays && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-700 dark:text-amber-400">請求日の</span>
              <input
                type="number" min={1} max={90}
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                className="w-16 rounded border border-amber-300 bg-white px-2 py-0.5 text-sm dark:border-amber-700 dark:bg-amber-950"
              />
              <span className="text-xs text-amber-700 dark:text-amber-400">日前から警告</span>
              <Button size="sm" className="h-7 text-xs" onClick={saveDays}>保存</Button>
            </div>
          )}

          {!editingDays && (
            <ul className="space-y-1">
              {upcoming.map((s) => {
                const days = daysUntil(s.next_billing_date)
                const isOverdue = days !== null && days < 0
                const isToday = days === 0
                return (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-amber-900 dark:text-amber-200">
                      {s.service_name}
                      {s.plan_name && s.plan_name !== EXPENSE_TAG ? (
                        <span className="ml-1 text-xs font-normal text-amber-700 dark:text-amber-400">
                          ({s.plan_name})
                        </span>
                      ) : null}
                    </span>
                    <span className={`shrink-0 text-xs ${
                      isOverdue ? 'font-semibold text-red-600 dark:text-red-400'
                      : isToday ? 'font-semibold text-orange-600 dark:text-orange-400'
                      : 'text-amber-700 dark:text-amber-400'
                    }`}>
                      {formatDate(s.next_billing_date)}
                      {isOverdue && ` (${Math.abs(days!)}日超過)`}
                      {isToday && ' (本日)'}
                      {!isOverdue && !isToday && days !== null && ` (${days}日後)`}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
