'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { formatJPY, isExpense, isSubscription, isOnceExpense } from '@/lib/utils'

const COLORS = [
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#f97316', // orange
  '#22c55e', // green
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
]

const CARD_TITLE = '今月のサブスク内訳'

export function CategoryPieChart() {
  const { data: subscriptions = [], isLoading } = useSubscriptions()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // yearly サブスク/支出は「請求月のみ全額計上」。
  //   - monthly     : price をそのまま加算
  //   - yearly      : next_billing_date が今月なら price 全額、それ以外は 0
  //   - once（支出） : price 全額
  //   - once（サブスク）: 除外
  const { chartData, subsTotal, expensesTotal } = useMemo(() => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const isBillingThisMonth = (s: { next_billing_date?: string | null }) =>
      s.next_billing_date?.startsWith(currentMonth) ?? false

    const catMap = new Map<string, { value: number; count: number }>()
    let expTotal = 0

    for (const s of subscriptions) {
      if (s.status !== 'active') continue

      // ── 支出 ──
      if (isExpense(s)) {
        if (isOnceExpense(s)) {
          expTotal += parseInt(s.price ?? '0', 10)
        } else if (s.billing_cycle === 'yearly') {
          if (isBillingThisMonth(s)) expTotal += parseInt(s.price ?? '0', 10)
        } else {
          // monthly
          expTotal += parseInt(s.price ?? '0', 10)
        }
        continue
      }

      // ── サブスク ──
      if (!isSubscription(s) || isOnceExpense(s)) continue

      let amount = 0
      if (s.billing_cycle === 'yearly') {
        if (isBillingThisMonth(s)) amount = parseInt(s.price ?? '0', 10)
      } else {
        // monthly
        amount = parseInt(s.price ?? '0', 10)
      }
      if (amount === 0) continue

      const cat = s.category ?? '未分類'
      const prev = catMap.get(cat)
      if (prev) {
        prev.value += amount
        prev.count++
      } else {
        catMap.set(cat, { value: amount, count: 1 })
      }
    }

    const chart = [...catMap.entries()]
      .map(([name, { value, count }]) => ({ name, value, count }))
      .filter((d) => d.value > 0)
      .sort((a, b) => a.name.localeCompare(b.name))

    const sTotal = chart.reduce((sum, d) => sum + d.value, 0)
    return { chartData: chart, subsTotal: sTotal, expensesTotal: expTotal }
  }, [subscriptions])

  const combinedTotal = subsTotal + expensesTotal
  const hovered = hoveredIndex !== null ? chartData[hoveredIndex] : null

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{CARD_TITLE}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
          <div className="h-40 w-40 animate-pulse rounded-full bg-muted" />
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{CARD_TITLE}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">データがありません</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{CARD_TITLE}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Donut chart */}
          <div className="relative mx-auto shrink-0" style={{ width: 180, height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                  isAnimationActive={false}
                  onMouseEnter={(_, index) => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                      opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.45}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center display */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-2 text-center">
              {hovered ? (
                <>
                  <span className="w-full truncate text-[10px] leading-tight text-muted-foreground">
                    {hovered.name}
                  </span>
                  <span className="text-sm font-bold leading-tight">{formatJPY(hovered.value)}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {subsTotal > 0 ? Math.round((hovered.value / subsTotal) * 100) : 0}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-muted-foreground">今月の合計</span>
                  <span className="text-sm font-bold leading-tight">{formatJPY(combinedTotal)}</span>
                  <span className="text-[9px] leading-tight text-muted-foreground">
                    サブスク＋支出
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Category list (subscriptions only) */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {chartData.map((d, i) => {
              const pct = subsTotal > 0 ? Math.round((d.value / subsTotal) * 100) : 0
              const isHovered = hoveredIndex === i
              return (
                <div
                  key={d.name}
                  className={`flex items-center gap-2 text-sm transition-opacity ${hoveredIndex !== null && !isHovered ? 'opacity-40' : ''}`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs">{d.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{pct}%</span>
                  <span className="shrink-0 text-xs font-medium tabular-nums">{formatJPY(d.value)}</span>
                </div>
              )
            })}

            {/* Footer: subs + expenses */}
            <div className="mt-2 space-y-1 border-t pt-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>サブスク（今月）</span>
                <span className="tabular-nums">{formatJPY(subsTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>支出</span>
                <span className="tabular-nums">{formatJPY(expensesTotal)}</span>
              </div>
              <div className="flex items-center justify-between font-medium">
                <span>合計</span>
                <span className="tabular-nums">{formatJPY(combinedTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
