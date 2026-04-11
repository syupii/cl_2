'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSummary } from '@/hooks/useSummary'

function formatJPY(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value)
}

// "2026-04" → "4月"
function toLabel(month: string): string {
  const [, m] = month.split('-')
  return `${parseInt(m, 10)}月`
}

export function MonthlyBarChart() {
  const { data, isLoading } = useSummary()

  const chartData = (data?.monthly_trend ?? []).map((pt) => ({
    month: toLabel(pt.month ?? ''),
    amount: parseInt(pt.amount_jpy ?? '0', 10),
  }))

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">月別支出推移</CardTitle>
        </CardHeader>
        <CardContent className="h-64 animate-pulse rounded bg-muted" />
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">月別支出推移（直近6ヶ月）</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) =>
                v >= 1000 ? `¥${(v / 1000).toFixed(0)}k` : `¥${v}`
              }
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              formatter={(value) => [formatJPY(Number(value)), '月額負担']}
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
