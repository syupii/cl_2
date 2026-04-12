'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, CreditCard, Activity, CalendarDays, Settings2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSummary } from '@/hooks/useSummary'
import { formatJPY } from '@/lib/utils'
import { STORAGE_KEYS } from '@/lib/constants'

const BUDGET_KEY = STORAGE_KEYS.MONTHLY_BUDGET

export function SummaryCards() {
  const { data, isLoading } = useSummary()
  const [budget, setBudget] = useState<number | null>(null)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(BUDGET_KEY)
    if (saved) setBudget(parseInt(saved, 10))
  }, [])

  function saveBudget() {
    const val = parseInt(budgetInput, 10)
    if (!isNaN(val) && val > 0) {
      localStorage.setItem(BUDGET_KEY, String(val))
      setBudget(val)
    } else if (budgetInput === '') {
      localStorage.removeItem(BUDGET_KEY)
      setBudget(null)
    }
    setEditingBudget(false)
  }

  const totalMonthly = parseInt(data?.total_monthly_jpy ?? '0', 10)
  const annualCost = totalMonthly * 12
  const activeCount = data?.active_count ?? 0
  const categoryCount = data?.category_breakdown?.length ?? 0
  const overBudget = budget !== null && totalMonthly > budget

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
          ⚠️ 月間予算（{formatJPY(budget!)}）を <strong>{formatJPY(totalMonthly - budget!)}</strong> 超過しています
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* 月間実質負担額 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              月間実質負担額
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <p className={`text-xl font-bold tracking-tight sm:text-3xl ${overBudget ? 'text-destructive' : ''}`}>
              {formatJPY(totalMonthly)}
            </p>
            <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
              年額は月額換算・外貨は JPY 換算済み
            </p>
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
            <p className="mt-1 hidden text-xs text-muted-foreground sm:block">月額 × 12 ヶ月</p>
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
