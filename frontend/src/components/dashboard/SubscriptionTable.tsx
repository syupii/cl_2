'use client'

import { useState, useMemo } from 'react'
import { Pencil, Ban, Download, Search, CalendarCheck, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSubscriptions, useUpdateSubscription } from '@/hooks/useSubscriptions'
import type { SubscriptionDTO } from '@/lib/api-client'
import { SubscriptionModal } from './SubscriptionModal'

function formatJPY(value: string | undefined): string {
  const num = parseInt(value ?? '0', 10)
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(isNaN(num) ? 0 : num)
}

function advanceDate(dateStr: string, cycle: string): string {
  const d = new Date(dateStr)
  if (cycle === 'yearly') {
    d.setFullYear(d.getFullYear() + 1)
  } else {
    d.setMonth(d.getMonth() + 1)
  }
  return d.toISOString().slice(0, 10)
}

type TabValue = 'active' | 'cancelled' | 'all'

export function SubscriptionTable() {
  const { data: subscriptions = [], isLoading } = useSubscriptions()
  const updateMutation = useUpdateSubscription()
  const [editTarget, setEditTarget] = useState<SubscriptionDTO | null>(null)
  const [tab, setTab] = useState<TabValue>('active')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const categories = useMemo(() => {
    const cats = subscriptions.map((s) => s.category).filter((c): c is string => !!c)
    return [...new Set(cats)].sort()
  }, [subscriptions])

  const filtered = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (tab === 'active' && sub.status !== 'active') return false
      if (tab === 'cancelled' && sub.status !== 'cancelled') return false
      if (search && !sub.service_name?.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter && sub.category !== categoryFilter) return false
      return true
    })
  }, [subscriptions, tab, search, categoryFilter])

  const activeCount = subscriptions.filter((s) => s.status === 'active').length
  const cancelledCount = subscriptions.filter((s) => s.status === 'cancelled').length

  function exportCSV() {
    const headers = ['サービス名', 'プラン名', '料金', '通貨', '支払い周期', '次回請求日', 'カテゴリ', '決済手段', 'メモ', 'ステータス', '月額負担(JPY)']
    const rows = subscriptions.map((sub) => [
      sub.service_name ?? '',
      sub.plan_name ?? '',
      sub.price ?? '',
      sub.currency ?? '',
      sub.billing_cycle === 'yearly' ? '年払い' : '月払い',
      sub.next_billing_date ?? '',
      sub.category ?? '',
      sub.payment_method ?? '',
      sub.notes ?? '',
      sub.status === 'active' ? '有効' : '解約済み',
      sub.monthly_cost_jpy ?? '',
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscriptions_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSVをエクスポートしました')
  }

  async function handleCancel(sub: SubscriptionDTO) {
    if (!confirm(`「${sub.service_name}」を解約済みにしますか？`)) return
    try {
      await updateMutation.mutateAsync({
        id: sub.id!,
        body: {
          service_name: sub.service_name,
          plan_name: sub.plan_name ?? undefined,
          price: sub.price,
          currency: sub.currency,
          billing_cycle: sub.billing_cycle,
          next_billing_date: sub.next_billing_date,
          category: sub.category ?? undefined,
          payment_method: sub.payment_method ?? undefined,
          notes: sub.notes ?? undefined,
          status: 'cancelled',
        },
      })
      toast.success('解約済みに変更しました')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました')
    }
  }

  async function handleAdvanceDate(sub: SubscriptionDTO) {
    const next = advanceDate(sub.next_billing_date ?? '', sub.billing_cycle ?? 'monthly')
    if (!confirm(`次回請求日を ${next} に更新しますか？`)) return
    try {
      await updateMutation.mutateAsync({
        id: sub.id!,
        body: {
          service_name: sub.service_name,
          plan_name: sub.plan_name ?? undefined,
          price: sub.price,
          currency: sub.currency,
          billing_cycle: sub.billing_cycle,
          next_billing_date: next,
          category: sub.category ?? undefined,
          payment_method: sub.payment_method ?? undefined,
          notes: sub.notes ?? undefined,
          status: sub.status as 'active' | 'cancelled',
        },
      })
      toast.success(`次回請求日を ${next} に更新しました`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* ツールバー */}
      <div className="mb-3 flex flex-col gap-3">
        {/* タブ */}
        <div className="flex gap-1 rounded-lg border p-1 w-fit">
          {([
            ['active', `有効 (${activeCount})`],
            ['cancelled', `解約 (${cancelledCount})`],
            ['all', `全て (${subscriptions.length})`],
          ] as [TabValue, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`rounded-md px-2 sm:px-3 py-1 text-xs sm:text-sm transition-colors ${
                tab === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 検索 + フィルタ + CSV */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-32">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="サービス名で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
          >
            <option value="">全カテゴリ</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 gap-1">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            {subscriptions.length === 0 ? 'サブスクリプションがありません' : '条件に一致するサブスクがありません'}
          </p>
        </div>
      ) : (
        <>
          {/* モバイル: カードレイアウト */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((sub) => (
              <div
                key={sub.id}
                className={`rounded-lg border p-3 ${sub.status === 'cancelled' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{sub.service_name}</p>
                    {sub.plan_name && <p className="text-xs text-muted-foreground">{sub.plan_name}</p>}
                    {sub.category && <p className="text-xs text-muted-foreground">{sub.category}</p>}
                    {sub.notes && (
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />{sub.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatJPY(sub.monthly_cost_jpy)}<span className="text-xs font-normal text-muted-foreground">/月</span></p>
                    <p className="text-xs text-muted-foreground">{sub.next_billing_date}</p>
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className="mt-1 text-xs">
                      {sub.status === 'active' ? '有効' : '解約済み'}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTarget(sub)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {sub.status === 'active' && (
                    <>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-blue-600"
                        title="次回請求日を更新"
                        onClick={() => handleAdvanceDate(sub)}
                        disabled={updateMutation.isPending}
                      >
                        <CalendarCheck className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleCancel(sub)}
                        disabled={updateMutation.isPending}
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* デスクトップ: テーブルレイアウト */}
          <div className="hidden sm:block rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">サービス名</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">カテゴリ</th>
                  <th className="px-4 py-3 text-left font-medium">月額(JPY)</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">次回請求日</th>
                  <th className="px-4 py-3 text-left font-medium hidden xl:table-cell">メモ</th>
                  <th className="px-4 py-3 text-left font-medium">状態</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((sub) => (
                  <tr key={sub.id} className={`hover:bg-muted/30 transition-colors ${sub.status === 'cancelled' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{sub.service_name}</p>
                      {sub.plan_name && <p className="text-xs text-muted-foreground">{sub.plan_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {sub.category ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatJPY(sub.monthly_cost_jpy)}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{sub.next_billing_date}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell max-w-40 truncate">
                      {sub.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                        {sub.status === 'active' ? '有効' : '解約済み'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTarget(sub)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {sub.status === 'active' && (
                          <>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700"
                              title="次回請求日を更新"
                              onClick={() => handleAdvanceDate(sub)}
                              disabled={updateMutation.isPending}
                            >
                              <CalendarCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleCancel(sub)}
                              disabled={updateMutation.isPending}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editTarget && (
        <SubscriptionModal
          open={true}
          onOpenChange={(open) => { if (!open) setEditTarget(null) }}
          editData={editTarget}
        />
      )}
    </>
  )
}
