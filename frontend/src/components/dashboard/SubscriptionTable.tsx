'use client'

import { useState, useMemo } from 'react'
import { Pencil, Ban, Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

type TabValue = 'active' | 'cancelled' | 'all'

export function SubscriptionTable() {
  const { data: subscriptions = [], isLoading } = useSubscriptions()
  const updateMutation = useUpdateSubscription()
  const [editTarget, setEditTarget] = useState<SubscriptionDTO | null>(null)
  const [tab, setTab] = useState<TabValue>('active')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // 既存のカテゴリ一覧
  const categories = useMemo(() => {
    const cats = subscriptions
      .map((s) => s.category)
      .filter((c): c is string => !!c)
    return [...new Set(cats)].sort()
  }, [subscriptions])

  // フィルタリング
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

  // CSV エクスポート
  function exportCSV() {
    const headers = ['サービス名', 'プラン名', '料金', '通貨', '支払い周期', '次回請求日', 'カテゴリ', '決済手段', 'ステータス', '月額負担(JPY)']
    const rows = subscriptions.map((sub) => [
      sub.service_name ?? '',
      sub.plan_name ?? '',
      sub.price ?? '',
      sub.currency ?? '',
      sub.billing_cycle === 'yearly' ? '年払い' : '月払い',
      sub.next_billing_date ?? '',
      sub.category ?? '',
      sub.payment_method ?? '',
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
          status: 'cancelled',
        },
      })
      toast.success('解約済みに変更しました')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* ツールバー */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* タブ */}
        <div className="flex gap-1 rounded-lg border p-1 w-fit">
          {([
            ['active', `有効 (${activeCount})`],
            ['cancelled', `解約済み (${cancelledCount})`],
            ['all', `すべて (${subscriptions.length})`],
          ] as [TabValue, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                tab === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 検索 + カテゴリ + CSV */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="サービス名で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 w-40 sm:w-48"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
          >
            <option value="">すべてのカテゴリ</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 gap-1">
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            {subscriptions.length === 0
              ? 'サブスクリプションがありません'
              : '条件に一致するサブスクがありません'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>サービス名</TableHead>
                <TableHead className="hidden sm:table-cell">カテゴリ</TableHead>
                <TableHead>月額負担 (JPY)</TableHead>
                <TableHead className="hidden md:table-cell">通貨/周期</TableHead>
                <TableHead className="hidden lg:table-cell">次回請求日</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow key={sub.id} className={sub.status === 'cancelled' ? 'opacity-50' : ''}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{sub.service_name}</p>
                      {sub.plan_name && (
                        <p className="text-xs text-muted-foreground">{sub.plan_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {sub.category ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatJPY(sub.monthly_cost_jpy)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs">
                      {sub.currency} /{' '}
                      {sub.billing_cycle === 'yearly' ? '年払い' : '月払い'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {sub.next_billing_date}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                      {sub.status === 'active' ? '有効' : '解約済み'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditTarget(sub)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {sub.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleCancel(sub)}
                          disabled={updateMutation.isPending}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
