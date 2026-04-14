'use client'

import { useEffect, useState } from 'react'
import { Separator } from '@/components/ui/separator'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart'
import { MonthlyBarChart } from '@/components/dashboard/MonthlyBarChart'
import { BillingAlerts } from '@/components/dashboard/BillingAlerts'
import { DashboardSettings, loadWidgetConfig, type WidgetConfig } from '@/components/dashboard/DashboardSettings'

export default function DashboardPage() {
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({
    alerts: true,
    kpi: true,
    charts: true,
  })

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
            支出の概要と統計
          </p>
        </div>
        <DashboardSettings config={widgetConfig} onChange={setWidgetConfig} />
      </div>

      {/* Billing alerts */}
      {widgetConfig.alerts && <BillingAlerts />}

      {/* KPI cards */}
      {widgetConfig.kpi && <SummaryCards />}

      {(widgetConfig.kpi || widgetConfig.charts) && <Separator />}

      {/* Charts */}
      {widgetConfig.charts && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CategoryPieChart />
          <MonthlyBarChart />
        </div>
      )}
    </div>
  )
}
