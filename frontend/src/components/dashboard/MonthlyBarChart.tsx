'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSummary } from '@/hooks/useSummary'
import { formatJPY } from '@/lib/utils'

function toLabel(month: string): string {
  const [, m] = month.split('-')
  return `${parseInt(m, 10)}月`
}

function shortJPY(v: number): string {
  if (v >= 10000) return `${Math.round(v / 1000)}k`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return `${v}`
}

export function MonthlyBarChart() {
  const { data, isLoading } = useSummary()

  const chartData = (data?.monthly_trend ?? []).map((pt) => ({
    month: toLabel(pt.month ?? ''),
    amount: parseInt(pt.amount_jpy ?? '0', 10),
  }))

  const maxAmount = Math.max(...chartData.map((d) => d.amount), 0)

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">月別支出推移</CardTitle>
        </CardHeader>
        <CardContent className="h-64 animate-pulse rounded bg-muted" />
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">月別支出推移（直近6ヶ月）</CardTitle>
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
        <CardTitle className="text-sm font-medium">月別支出推移（直近6ヶ月）</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-4">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={chartData}
            margin={{ top: 24, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={shortJPY}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={44}
              domain={[0, maxAmount > 0 ? Math.ceil(maxAmount * 1.15) : 10000]}
            />
            <Tooltip
              formatter={(value) => [formatJPY(Number(value)), '支出合計']}
              cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
              contentStyle={{
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
              }}
            />
            <Bar dataKey="amount" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={56}>
              <LabelList
                dataKey="amount"
                position="top"
                formatter={(v: unknown) => Number(v) > 0 ? `¥${shortJPY(Number(v))}` : ''}
                style={{ fontSize: '10px', fill: 'hsl(var(--muted-foreground))' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
