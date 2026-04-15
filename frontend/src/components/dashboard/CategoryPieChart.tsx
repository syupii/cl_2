'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSummary } from '@/hooks/useSummary'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { formatJPY, isExpense, isOnceExpense } from '@/lib/utils'

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

const CARD_TITLE = '月額サブスク内訳'

export function CategoryPieChart() {
  const { data, isLoading: summaryLoading } = useSummary()
  const { data: subscriptions = [], isLoading: subsLoading } = useSubscriptions()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // 円グラフはサブスクのみ（月額換算）。
  // summary.category_breakdown はバックエンド側で expense 行を除外し、
  // yearly は ÷12 済みの月額を返すのでそのまま使える。
  const chartData = (data?.category_breakdown ?? [])
    .map((cat) => ({
      name: cat.category ?? '未分類',
      value: parseInt(cat.amount_jpy ?? '0', 10),
      count: cat.count ?? 0,
    }))
    .filter((d) => d.value > 0)

  // 中央に表示する合計: サブスク月額 + 支出（recurring）の月額。
  // once（一回払い）は毎月発生しないのでここでは足さない。
  const subsMonthly = chartData.reduce((sum, d) => sum + d.value, 0)
  const expensesMonthly = useMemo(() => {
    let total = 0
    for (const s of subscriptions) {
      if (!isExpense(s) || s.status !== 'active' || isOnceExpense(s)) continue
      total += parseInt(s.monthly_cost_jpy ?? '0', 10)
    }
    return total
  }, [subscriptions])
  const combinedMonthly = subsMonthly + expensesMonthly

  const isLoading = summaryLoading || subsLoading
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

            {/* Center display: combined monthly total or hovered item */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-2 text-center">
              {hovered ? (
                <>
                  <span className="w-full truncate text-[10px] leading-tight text-muted-foreground">
                    {hovered.name}
                  </span>
                  <span className="text-sm font-bold leading-tight">{formatJPY(hovered.value)}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {subsMonthly > 0 ? Math.round((hovered.value / subsMonthly) * 100) : 0}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-muted-foreground">月額合計</span>
                  <span className="text-sm font-bold leading-tight">{formatJPY(combinedMonthly)}</span>
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
              const pct = subsMonthly > 0 ? Math.round((d.value / subsMonthly) * 100) : 0
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

            {/* Combined total footer: subs + recurring expenses */}
            <div className="mt-2 space-y-1 border-t pt-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>サブスク月額</span>
                <span className="tabular-nums">{formatJPY(subsMonthly)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>支出月額</span>
                <span className="tabular-nums">{formatJPY(expensesMonthly)}</span>
              </div>
              <div className="flex items-center justify-between font-medium">
                <span>合計</span>
                <span className="tabular-nums">{formatJPY(combinedMonthly)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
