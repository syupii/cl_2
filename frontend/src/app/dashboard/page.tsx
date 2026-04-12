'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart'
import { MonthlyBarChart } from '@/components/dashboard/MonthlyBarChart'
import { SubscriptionTable } from '@/components/dashboard/SubscriptionTable'
import { SubscriptionModal } from '@/components/dashboard/SubscriptionModal'
import { PaymentMethodManager } from '@/components/dashboard/PaymentMethodManager'
import { BillingAlerts } from '@/components/dashboard/BillingAlerts'
import { DashboardSettings, loadWidgetConfig, type WidgetConfig } from '@/components/dashboard/DashboardSettings'

export default function DashboardPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({
    alerts: true,
    kpi: true,
    charts: true,
  })

  // クライアントサイドで localStorage から読み込む
  useEffect(() => {
    setWidgetConfig(loadWidgetConfig())
  }, [])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">ダッシュボード</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            登録済みサブスクリプションの概要
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <DashboardSettings config={widgetConfig} onChange={setWidgetConfig} />
          <PaymentMethodManager />
          <Button onClick={() => setAddOpen(true)} size="sm" className="h-9">
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">サービスを追加</span>
          </Button>
        </div>
      </div>

      {/* Billing alerts */}
      {widgetConfig.alerts && <BillingAlerts />}

      {/* KPI cards */}
      {widgetConfig.kpi && <SummaryCards />}

      {(widgetConfig.kpi || widgetConfig.charts) && <Separator />}

      {/* Charts row */}
      {widgetConfig.charts && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CategoryPieChart />
          <MonthlyBarChart />
        </div>
      )}

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
