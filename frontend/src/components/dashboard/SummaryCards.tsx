'use client'

import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, CreditCard, Activity, CalendarDays, Settings2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSummary } from '@/hooks/useSummary'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { formatJPY, isSubscription, isExpense, isOnceExpense } from '@/lib/utils'
import { loadBudget } from '@/lib/localStorage'
import { STORAGE_KEYS } from '@/lib/constants'

type CostView = 'actual' | 'averaged'

export function SummaryCards() {
  const { data, isLoading } = useSummary()
  const { data: subscriptions = [] } = useSubscriptions()
  const [budget, setBudget] = useState<number | null>(null)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [costView, setCostView] = useState<CostView>('actual')

  useEffect(() => {
    setBudget(loadBudget())
  }, [])

  function saveBudget() {
    const val = parseInt(budgetInput, 10)
    if (!isNaN(val) && val > 0) {
      localStorage.setItem(STORAGE_KEYS.MONTHLY_BUDGET, String(val))
      setBudget(val)
    } else if (budgetInput === '') {
      localStorage.removeItem(STORAGE_KEYS.MONTHLY_BUDGET)
      setBudget(null)
    }
    setEditingBudget(false)
  }

  // ── 月額換算（averaged）: summary API の total_monthly_jpy ベース ──
  const recurringMonthly = parseInt(data?.total_monthly_jpy ?? '0', 10)
  const onceTotal = parseInt(data?.once_total_jpy ?? '0', 10)
  const averagedMonthly = recurringMonthly + onceTotal

  // ── 実際の今月負担（actual）: 請求月のみ全額計上 ──
  const actualMonthly = useMemo(() => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const isBillingThisMonth = (s: { next_billing_date?: string | null }) =>
      s.next_billing_date?.startsWith(currentMonth) ?? false

    let total = 0
    for (const s of subscriptions) {
      if (s.status !== 'active') continue

      if (isExpense(s)) {
        if (isOnceExpense(s)) {
          total += parseInt(s.price ?? '0', 10)
        } else if (s.billing_cycle === 'yearly') {
          if (isBillingThisMonth(s)) total += parseInt(s.price ?? '0', 10)
        } else {
          total += parseInt(s.price ?? '0', 10)
        }
        continue
      }

      if (!isSubscription(s)) continue
      const monthlyJPY = parseInt(s.monthly_cost_jpy ?? '0', 10)
      if (s.billing_cycle === 'yearly') {
        if (isBillingThisMonth(s)) total += monthlyJPY * 12
      } else if (s.billing_cycle === 'monthly') {
        total += monthlyJPY
      }
    }
    return total
  }, [subscriptions])

  const displayedMonthly = costView === 'actual' ? actualMonthly : averagedMonthly
  // 年間コストは月額換算ベース: recurring ×12、once はそのまま加算。
  const annualCost = recurringMonthly * 12 + onceTotal
  // サブスクのみカウント（支出・一回払いを除外）
  const activeCount = subscriptions.filter((s) => isSubscription(s) && s.status === 'active').length
  const categoryCount = data?.category_breakdown?.length ?? 0
  const overBudget = budget !== null && displayedMonthly > budget

  // 前月比（monthly_trend の末尾2件から計算）
  const trend = data?.monthly_trend ?? []
  const prevAmount = trend.length >= 2 ? parseInt(trend[trend.length - 2].amount_jpy ?? '0', 10) : null
  const currAmount = trend.length >= 1 ? parseInt(trend[trend.length - 1].amount_jpy ?? '0', 10) : null
  const trendPct = prevAmount !== null && currAmount !== null && prevAmount > 0
    ? Math.round(((currAmount - prevAmount) / prevAmount) * 100)
    : null

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                <div className="h-3 w-20 rounded bg-muted" />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="h-7 w-24 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 予算超過警告 */}
      {overBudget && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          ⚠️ 月間予算（{formatJPY(budget!)}）を <strong>{formatJPY(displayedMonthly - budget!)}</strong> 超過しています
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* 月間負担額 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              {costView === 'actual' ? '今月の負担額' : '月間実質負担額'}
            </CardTitle>
            <div className="flex shrink-0 overflow-hidden rounded-md border text-[10px]">
              <button
                className={`px-1.5 py-0.5 transition-colors ${costView === 'actual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setCostView('actual')}
              >
                実額
              </button>
              <button
                className={`px-1.5 py-0.5 transition-colors ${costView === 'averaged' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setCostView('averaged')}
              >
                月額換算
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className={`text-xl font-bold tracking-tight sm:text-3xl ${overBudget ? 'text-destructive' : ''}`}>
              {formatJPY(displayedMonthly)}
            </p>
            {costView === 'actual' ? (
              <p className="mt-1 text-xs text-muted-foreground">
                請求月のみ計上
              </p>
            ) : onceTotal > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                内 一時費 {formatJPY(onceTotal)}
              </p>
            ) : trendPct !== null ? (
              <p className={`mt-1 text-xs font-medium ${trendPct > 0 ? 'text-destructive' : trendPct < 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                {trendPct > 0 ? '▲' : trendPct < 0 ? '▼' : '─'} {Math.abs(trendPct)}% 前月比
              </p>
            ) : (
              <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
                年額は月額換算・外貨は JPY 換算済み
              </p>
            )}
          </CardContent>
        </Card>

        {/* 年間コスト */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              年間コスト
            </CardTitle>
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-xl font-bold tracking-tight sm:text-3xl">{formatJPY(annualCost)}</p>
            <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
              {onceTotal > 0 ? '月額 × 12 + 一時費' : '月額 × 12 ヶ月'}
            </p>
          </CardContent>
        </Card>

        {/* 有効なサブスク数 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              有効サブスク数
            </CardTitle>
            <CreditCard className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-xl font-bold tracking-tight sm:text-3xl">{activeCount}</p>
            <p className="mt-1 hidden text-xs text-muted-foreground sm:block">ステータス: active</p>
          </CardContent>
        </Card>

        {/* カテゴリ数 + 予算設定 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              カテゴリ数
            </CardTitle>
            <div className="flex shrink-0 items-center gap-0.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="月間予算を設定"
                onClick={() => {
                  setBudgetInput(budget ? String(budget) : '')
                  setEditingBudget(true)
                }}
              >
                <Settings2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className="text-xl font-bold tracking-tight sm:text-3xl">{categoryCount}</p>
            {budget !== null ? (
              <p className="mt-1 text-xs text-muted-foreground">
                予算: {formatJPY(budget)}/月
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                予算未設定
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 予算設定インライン */}
      {editingBudget && (
        <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
          <span className="text-sm font-medium text-muted-foreground">月間予算</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="例: 5000"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="h-8 flex-1 sm:w-36 sm:flex-none"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') saveBudget() }}
            />
            <span className="text-sm text-muted-foreground">円</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveBudget} className="flex-1 sm:flex-none">保存</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingBudget(false)} className="flex-1 sm:flex-none">
              キャンセル
            </Button>
            {budget !== null && (
              <Button
                size="sm" variant="ghost" className="text-destructive flex-1 sm:flex-none"
                onClick={() => { setBudgetInput(''); saveBudget() }}
              >
                削除
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
