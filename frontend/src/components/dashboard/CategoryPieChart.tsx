'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSummary } from '@/hooks/useSummary'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { formatJPY, isExpense } from '@/lib/utils'

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

type ViewMode = 'monthly' | 'actual'

export function CategoryPieChart() {
  const { data, isLoading: summaryLoading } = useSummary()
  const { data: subscriptions = [], isLoading: subsLoading } = useSubscriptions()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')

  // 月額換算ビュー: summary API の monthly_cost_jpy ベース（yearly は ÷12 済み）
  const monthlyChartData = (data?.category_breakdown ?? []).map((cat) => ({
    name: cat.category ?? '未分類',
    value: parseInt(cat.amount_jpy ?? '0', 10),
    count: cat.count ?? 0,
  }))

  // 実費ビュー: サブスクリプションの実際の請求額
  // yearly → monthly_cost_jpy × 12 で年額を復元、monthly → monthly_cost_jpy そのまま
  const actualChartData = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of subscriptions) {
      if (isExpense(s) || s.status !== 'active') continue
      const monthly = parseInt(s.monthly_cost_jpy ?? '0', 10)
      if (monthly === 0) continue // once 等の ¥0 は除外
      const amount = s.billing_cycle === 'yearly' ? monthly * 12 : monthly
      const cat = s.category ?? '未分類'
      map.set(cat, (map.get(cat) ?? 0) + amount)
    }
    return [...map.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, count: 1 }))
  }, [subscriptions])

  const isLoading = summaryLoading || subsLoading
  const chartData = viewMode === 'monthly' ? monthlyChartData : actualChartData
  const total = chartData.reduce((sum, d) => sum + d.value, 0)
  const hovered = hoveredIndex !== null ? chartData[hoveredIndex] : null

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">カテゴリ別サブスク</CardTitle>
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
          <CardTitle className="text-sm font-medium">カテゴリ別サブスク</CardTitle>
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">カテゴリ別サブスク</CardTitle>
          <div className="flex overflow-hidden rounded-md border text-xs">
            <button
              className={`px-2.5 py-1 transition-colors ${viewMode === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => { setHoveredIndex(null); setViewMode('monthly') }}
            >
              月額換算
            </button>
            <button
              className={`px-2.5 py-1 transition-colors ${viewMode === 'actual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => { setHoveredIndex(null); setViewMode('actual') }}
            >
              実費
            </button>
          </div>
        </div>
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

            {/* Center display: total or hovered item */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-2 text-center">
              {hovered ? (
                <>
                  <span className="w-full truncate text-[10px] leading-tight text-muted-foreground">
                    {hovered.name}
                  </span>
                  <span className="text-sm font-bold leading-tight">{formatJPY(hovered.value)}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {total > 0 ? Math.round((hovered.value / total) * 100) : 0}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-muted-foreground">
                    {viewMode === 'monthly' ? '月額合計' : '実費合計'}
                  </span>
                  <span className="text-sm font-bold leading-tight">{formatJPY(total)}</span>
                </>
              )}
            </div>
          </div>

          {/* Category list */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {chartData.map((d, i) => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
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
