'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSummary } from '@/hooks/useSummary'
import { formatJPY } from '@/lib/utils'

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

const CARD_TITLE = 'サブスク月額（カテゴリ別）'

export function CategoryPieChart() {
  const { data, isLoading } = useSummary()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // 円グラフはサブスクのみ（月額換算）。
  // summary.category_breakdown はバックエンド側で expense 行を除外し、
  // yearly は ÷12 済みの月額を返すのでそのまま使える。支出はこのカードに
  // 一切含めない（支出は「支出管理」ビューで別枠管理）。
  const chartData = (data?.category_breakdown ?? [])
    .map((cat) => ({
      name: cat.category ?? '未分類',
      value: parseInt(cat.amount_jpy ?? '0', 10),
      count: cat.count ?? 0,
    }))
    .filter((d) => d.value > 0)

  const subsMonthly = chartData.reduce((sum, d) => sum + d.value, 0)
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

            {/* Center display: subscription monthly total or hovered item */}
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
                  <span className="text-[10px] text-muted-foreground">サブスク月額</span>
                  <span className="text-sm font-bold leading-tight">{formatJPY(subsMonthly)}</span>
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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
