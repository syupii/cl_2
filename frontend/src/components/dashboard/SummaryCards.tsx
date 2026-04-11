'use client'

import { TrendingUp, CreditCard, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSummary } from '@/hooks/useSummary'

function formatJPY(value: string | undefined): string {
  const num = parseInt(value ?? '0', 10)
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(isNaN(num) ? 0 : num)
}

export function SummaryCards() {
  const { data, isLoading } = useSummary()

  const total = formatJPY(data?.total_monthly_jpy)
  const activeCount = data?.active_count ?? 0
  const categoryCount = data?.category_breakdown?.length ?? 0

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            月間実質負担額
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tracking-tight">{total}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            年額サービスは月額換算済み・外貨は JPY 換算済み
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            有効なサブスク数
          </CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tracking-tight">{activeCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">ステータス: active</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            カテゴリ数
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tracking-tight">{categoryCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">支出カテゴリ</p>
        </CardContent>
      </Card>
    </div>
  )
}
