'use client'

import { useState } from 'react'
import { Pencil, Ban } from 'lucide-react'
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

export function SubscriptionTable() {
  const { data: subscriptions = [], isLoading } = useSubscriptions()
  const updateMutation = useUpdateSubscription()
  const [editTarget, setEditTarget] = useState<SubscriptionDTO | null>(null)

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

  if (subscriptions.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">サブスクリプションがありません</p>
        <p className="text-xs text-muted-foreground">
          「サービスを追加」から最初のサブスクを登録してください
        </p>
      </div>
    )
  }

  return (
    <>
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
            {subscriptions.map((sub) => (
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
