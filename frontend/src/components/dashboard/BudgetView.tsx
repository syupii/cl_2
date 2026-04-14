'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSubscriptions, useDeleteSubscription, useUpdateSubscription } from '@/hooks/useSubscriptions'
import { formatJPY, isExpense } from '@/lib/utils'
import { loadBudget } from '@/lib/localStorage'
import { ExpenseModal } from './ExpenseModal'
import type { SubscriptionDTO } from '@/lib/api-client'

export function BudgetView() {
  const { data: all = [], isLoading } = useSubscriptions()
  const deleteMutation = useDeleteSubscription()
  const updateMutation = useUpdateSubscription()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SubscriptionDTO | null>(null)
  const [budget, setBudget] = useState<number | null>(null)
  const [categoryView, setCategoryView] = useState<'recurring' | 'all'>('recurring')

  useEffect(() => {
    setBudget(loadBudget())
  }, [])

  // 支出のみ（有効・解約を分けて表示）
  const expenses = useMemo(() => all.filter(isExpense), [all])
  const activeExpenses = useMemo(() => expenses.filter((s) => s.status === 'active'), [expenses])
  const cancelledExpenses = useMemo(() => expenses.filter((s) => s.status === 'cancelled'), [expenses])

  // 毎月払いのみ recurring、年払い・一回払いはすべて非定期扱い
  const recurringExpenses = useMemo(() => activeExpenses.filter((s) => s.billing_cycle === 'monthly'), [activeExpenses])
  const onceExpenses = useMemo(() => activeExpenses.filter((s) => s.billing_cycle !== 'monthly'), [activeExpenses])

  // 月額合計（recurring のみ）
  const totalMonthly = useMemo(
    () => recurringExpenses.reduce((sum, s) => sum + parseInt(s.monthly_cost_jpy ?? '0', 10), 0),
    [recurringExpenses]
  )

  // 一回払い合計（実際の金額）
  const totalOnce = useMemo(
    () => onceExpenses.reduce((sum, s) => sum + parseInt(s.price ?? '0', 10), 0),
    [onceExpenses]
  )

  // カテゴリ別集計 — 固定費ビュー（recurring のみ、月額換算）
  const categoryBreakdownRecurring = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of recurringExpenses) {
      const cat = s.category ?? '未分類'
      map.set(cat, (map.get(cat) ?? 0) + parseInt(s.monthly_cost_jpy ?? '0', 10))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [recurringExpenses])

  // カテゴリ別集計 — 全支出ビュー（実際の金額）
  const categoryBreakdownAll = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of activeExpenses) {
      const cat = s.category ?? '未分類'
      map.set(cat, (map.get(cat) ?? 0) + parseInt(s.price ?? '0', 10))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [activeExpenses])

  const categoryBreakdown = categoryView === 'recurring' ? categoryBreakdownRecurring : categoryBreakdownAll

  // カテゴリ別パーセント計算用の合計
  const categoryTotal = useMemo(
    () => categoryBreakdown.reduce((sum, [, v]) => sum + v, 0),
    [categoryBreakdown]
  )

  const totalAll = totalMonthly + totalOnce

  const budgetPct = budget !== null && budget > 0 ? Math.min((totalAll / budget) * 100, 100) : null
  const overBudget = budget !== null && totalAll > budget

  async function handleDelete(sub: SubscriptionDTO) {
    if (!confirm(`「${sub.service_name}」を削除しますか？`)) return
    try {
      await deleteMutation.mutateAsync(sub.id!)
      toast.success('削除しました')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  async function handleRestore(sub: SubscriptionDTO) {
    try {
      await updateMutation.mutateAsync({
        id: sub.id!,
        body: {
          service_name: sub.service_name,
          plan_name: sub.plan_name ?? undefined,
          price: sub.price,
          currency: sub.currency,
          billing_cycle: sub.billing_cycle,
          next_billing_date: sub.next_billing_date ?? '',
          category: sub.category ?? undefined,
          notes: sub.notes ?? undefined,
          status: 'active',
        },
      })
      toast.success('有効に戻しました')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">支出管理</h2>
          <p className="text-sm text-muted-foreground">家賃・光熱費などサブスク以外の支出を管理します</p>
        </div>
        <Button onClick={() => { setEditTarget(null); setModalOpen(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" />
          支出を追加
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今月の支出合計</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className={`text-2xl font-bold ${overBudget ? 'text-destructive' : ''}`}>
              {formatJPY(totalAll)}
            </p>
            {budget !== null && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                予算: {formatJPY(budget)}
                {overBudget && (
                  <span className="ml-1 text-destructive font-medium">
                    （{formatJPY(totalAll - budget)} 超過）
                  </span>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">登録支出件数</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{recurringExpenses.length}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              毎月{onceExpenses.length > 0 ? `・一回払い ${onceExpenses.length}件` : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 予算プログレスバー */}
      {budgetPct !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>予算使用率</span>
            <span>{Math.round(budgetPct)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${overBudget ? 'bg-destructive' : budgetPct > 80 ? 'bg-orange-500' : 'bg-primary'}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>
      )}

      {/* カテゴリ別内訳 */}
      {(categoryBreakdownRecurring.length > 0 || categoryBreakdownAll.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">カテゴリ別</h3>
            <div className="ml-auto flex overflow-hidden rounded-md border text-xs">
              <button
                className={`px-2.5 py-1 transition-colors ${categoryView === 'recurring' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setCategoryView('recurring')}
              >
                固定費
              </button>
              <button
                className={`px-2.5 py-1 transition-colors ${categoryView === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setCategoryView('all')}
              >
                全支出
              </button>
            </div>
          </div>
          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">データがありません</p>
          ) : (
            <div className="space-y-2">
              {categoryBreakdown.map(([cat, amount]) => {
                const pct = categoryTotal > 0 ? (amount / categoryTotal) * 100 : 0
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat}</span>
                      <span className="text-muted-foreground">{formatJPY(amount)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 毎月の支出一覧 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          毎月の支出（{recurringExpenses.length}件）
        </h3>

        {recurringExpenses.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">毎月の支出がありません</p>
            <Button variant="outline" size="sm" onClick={() => { setEditTarget(null); setModalOpen(true) }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              支出を追加
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {recurringExpenses.map((sub) => (
              <ExpenseCard
                key={sub.id}
                sub={sub}
                onEdit={() => { setEditTarget(sub); setModalOpen(true) }}
                onDelete={() => handleDelete(sub)}
                isPending={deleteMutation.isPending || updateMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* 年払い・一回払いの支出 */}
      {onceExpenses.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              年払い・一回払い（{onceExpenses.length}件）
            </h3>
            <span className="text-sm font-medium">{formatJPY(totalOnce)}</span>
          </div>
          <div className="space-y-2">
            {onceExpenses.map((sub) => (
              <ExpenseCard
                key={sub.id}
                sub={sub}
                onEdit={() => { setEditTarget(sub); setModalOpen(true) }}
                onDelete={() => handleDelete(sub)}
                isPending={deleteMutation.isPending || updateMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* 解約済み支出 */}
      {cancelledExpenses.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            停止中（{cancelledExpenses.length}件）
          </h3>
          <div className="space-y-2 opacity-60">
            {cancelledExpenses.map((sub) => (
              <ExpenseCard
                key={sub.id}
                sub={sub}
                onEdit={() => { setEditTarget(sub); setModalOpen(true) }}
                onDelete={() => handleDelete(sub)}
                onRestore={() => handleRestore(sub)}
                isPending={deleteMutation.isPending || updateMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* モーダル */}
      <ExpenseModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editData={editTarget}
      />
    </div>
  )
}

// ── カードコンポーネント ──────────────────────────────────────────────────────

interface ExpenseCardProps {
  sub: SubscriptionDTO
  onEdit: () => void
  onDelete: () => void
  onRestore?: () => void
  isPending: boolean
}

function ExpenseCard({ sub, onEdit, onDelete, onRestore, isPending }: ExpenseCardProps) {
  const isMonthly = sub.billing_cycle === 'monthly'
  const cycleLabel = sub.billing_cycle === 'once' ? '一回払い' : sub.billing_cycle === 'yearly' ? '年払い' : '毎月'

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{sub.service_name}</p>
          {sub.category && (
            <Badge variant="outline" className="shrink-0 text-xs">{sub.category}</Badge>
          )}
          {!isMonthly && (
            <Badge variant="secondary" className="shrink-0 text-xs">{cycleLabel}</Badge>
          )}
        </div>
        {sub.notes && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{sub.notes}</p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {cycleLabel} · 支払日: {sub.next_billing_date}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold">
          {isMonthly ? formatJPY(sub.monthly_cost_jpy) : formatJPY(sub.price)}
          {isMonthly && <span className="text-xs font-normal text-muted-foreground">/月</span>}
        </p>
        <div className="mt-1 flex items-center justify-end gap-0.5">
          {onRestore && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-green-600"
              title="有効に戻す" onClick={onRestore} disabled={isPending}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" title="編集" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-destructive"
            title="削除" onClick={onDelete} disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
