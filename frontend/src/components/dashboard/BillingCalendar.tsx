'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import type { SubscriptionDTO } from '@/lib/api-client'
import { isExpense, EXPENSE_TAG } from '@/lib/utils'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Returns the first Monday on or before the 1st of the month. */
function calendarStart(year: number, month: number): Date {
  const first = new Date(year, month, 1)
  const dow = first.getDay() // 0=Sun
  const offset = dow === 0 ? 6 : dow - 1 // Monday-based
  const start = new Date(first)
  start.setDate(1 - offset)
  return start
}

export function BillingCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [selected, setSelected] = useState<Date | null>(null)

  const { data: subs = [] } = useSubscriptions()

  // Build a map: "YYYY-MM-DD" → SubscriptionDTO[]
  const dateMap = useMemo(() => {
    const map = new Map<string, SubscriptionDTO[]>()
    subs.forEach((s) => {
      if (s.status !== 'active' || !s.next_billing_date) return
      const key = s.next_billing_date.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    })
    return map
  }, [subs])

  function dateKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // 6-week grid (42 cells)
  const start = calendarStart(year, month)
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  const selectedSubs = selected ? (dateMap.get(dateKey(selected)) ?? []) : []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold">
          {year}年{month + 1}月
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : ''}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-lg border bg-border">
        {cells.map((cell, i) => {
          const inMonth = cell.getMonth() === month
          const isToday = isSameDay(cell, today)
          const isSelected = selected ? isSameDay(cell, selected) : false
          const key = dateKey(cell)
          const events = dateMap.get(key) ?? []
          const dow = i % 7 // 0=Mon … 6=Sun

          return (
            <button
              key={key}
              onClick={() => setSelected(isSelected ? null : new Date(cell))}
              className={[
                'relative flex min-h-[64px] flex-col items-start gap-0.5 bg-background p-1.5 text-left transition-colors',
                inMonth ? '' : 'opacity-40',
                isSelected ? 'ring-2 ring-primary ring-inset' : 'hover:bg-accent',
                i === 0 ? 'rounded-tl-lg' : '',
                i === 6 ? 'rounded-tr-lg' : '',
                i === 35 ? 'rounded-bl-lg' : '',
                i === 41 ? 'rounded-br-lg' : '',
              ].join(' ')}
            >
              {/* Day number */}
              <span
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday ? 'bg-primary text-primary-foreground' : '',
                  !isToday && dow === 5 ? 'text-blue-500' : '',
                  !isToday && dow === 6 ? 'text-red-500' : '',
                ].join(' ')}
              >
                {cell.getDate()}
              </span>

              {/* Event dots */}
              <div className="flex flex-col gap-0.5 w-full">
                {events.slice(0, 2).map((s) => (
                  <span
                    key={s.id}
                    className={`w-full truncate rounded px-1 text-[10px] leading-4 ${isExpense(s) ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' : 'bg-primary/15 text-primary'}`}
                  >
                    {s.service_name}
                  </span>
                ))}
                {events.length > 2 && (
                  <span className="text-[10px] leading-4 text-muted-foreground">
                    +{events.length - 2}件
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="rounded-lg border p-4">
          <p className="mb-2 text-sm font-medium">
            {selected.getFullYear()}年{selected.getMonth() + 1}月{selected.getDate()}日
          </p>
          {selectedSubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">請求予定はありません</p>
          ) : (
            <ul className="space-y-2">
              {selectedSubs.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span>
                    {s.service_name}
                    {isExpense(s) ? (
                      <span className="ml-1 text-xs text-orange-500">支出</span>
                    ) : s.plan_name && s.plan_name !== EXPENSE_TAG ? (
                      <span className="ml-1 text-xs text-muted-foreground">({s.plan_name})</span>
                    ) : null}
                  </span>
                  <span className="font-medium">
                    {s.price} {s.currency}
                    <span className="ml-1 text-xs text-muted-foreground">
                      /{s.billing_cycle === 'yearly' ? '年' : '月'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
