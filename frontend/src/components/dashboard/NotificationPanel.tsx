'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSubscriptions } from '@/hooks/useSubscriptions'

const STORAGE_KEY = 'notif_dismissed' // { [subId]: dismissedForDate }
const WARN_DAYS = 30 // 通知ウィンドウ（日数）

function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
}

function loadDismissed(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveDismissed(val: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}

export function NotificationPanel() {
  const { data: subs = [] } = useSubscriptions()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<Record<string, string>>({})
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDismissed(loadDismissed())
  }, [])

  // パネル外クリックで閉じる
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const notifications = subs
    .filter((s) => s.status === 'active')
    .map((s) => {
      const days = daysUntil(s.next_billing_date)
      return { sub: s, days }
    })
    .filter(({ days }) => days !== null && days <= WARN_DAYS)
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))

  const unread = notifications.filter(
    ({ sub }) => dismissed[sub.id!] !== sub.next_billing_date
  )

  function dismissOne(id: string, date: string) {
    const next = { ...dismissed, [id]: date }
    setDismissed(next)
    saveDismissed(next)
  }

  function dismissAll() {
    const next = { ...dismissed }
    notifications.forEach(({ sub }) => {
      next[sub.id!] = sub.next_billing_date ?? ''
    })
    setDismissed(next)
    saveDismissed(next)
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
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
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-popover shadow-lg">
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">通知</p>
            {unread.length > 0 && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={dismissAll}
              >
                すべて既読にする
              </button>
            )}
          </div>

          {/* 通知リスト */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                今後30日以内の請求はありません
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
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sub.service_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(sub.next_billing_date)}
                        {isOverdue && (
                          <span className="ml-1 font-semibold text-destructive">
                            ({Math.abs(days!)}日超過)
                          </span>
                        )}
                        {isToday && (
                          <span className="ml-1 font-semibold text-orange-500">(本日)</span>
                        )}
                        {!isOverdue && !isToday && days !== null && (
                          <span className="ml-1">({days}日後)</span>
                        )}
                      </p>
                    </div>
                    {!isRead && (
                      <button
                        className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => dismissOne(sub.id!, sub.next_billing_date ?? '')}
                      >
                        既読
                      </button>
                    )}
                    {!isRead && (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">NEW</Badge>
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
