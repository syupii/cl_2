'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSummary } from '@/hooks/useSummary'

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#818cf8', '#4f46e5', '#7c3aed', '#d946ef',
]

function formatJPY(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value)
}

export function CategoryPieChart() {
  const { data, isLoading } = useSummary()

  const chartData = (data?.category_breakdown ?? []).map((cat) => ({
    name: cat.category ?? 'Uncategorized',
    value: parseInt(cat.amount_jpy ?? '0', 10),
    count: cat.count ?? 0,
  }))

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">カテゴリ別支出</CardTitle>
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
        <CardHeader>
          <CardTitle className="text-sm font-medium">カテゴリ別支出</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">データがありません</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">カテゴリ別支出</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2 sm:px-6 sm:pb-6">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [formatJPY(Number(value)), '月額負担']}
            />
            <Legend
              iconSize={10}
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
