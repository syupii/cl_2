'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart'
import { MonthlyBarChart } from '@/components/dashboard/MonthlyBarChart'
import { SubscriptionTable } from '@/components/dashboard/SubscriptionTable'
import { SubscriptionModal } from '@/components/dashboard/SubscriptionModal'
import { PaymentMethodManager } from '@/components/dashboard/PaymentMethodManager'

export default function DashboardPage() {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">
            登録済みサブスクリプションの概要
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PaymentMethodManager />
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            サービスを追加
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <SummaryCards />

      <Separator />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryPieChart />
        <MonthlyBarChart />
      </div>

      <Separator />

      {/* Subscription list */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">サブスクリプション一覧</h2>
        <SubscriptionTable />
      </div>

      {/* Add modal */}
      <SubscriptionModal
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  )
}
