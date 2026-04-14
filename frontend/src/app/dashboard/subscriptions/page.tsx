'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SubscriptionTable } from '@/components/dashboard/SubscriptionTable'
import { SubscriptionModal } from '@/components/dashboard/SubscriptionModal'
import { PaymentMethodManager } from '@/components/dashboard/PaymentMethodManager'
import { CategoryManager } from '@/components/dashboard/CategoryManager'
import { CSVImport } from '@/components/dashboard/CSVImport'

export default function SubscriptionsPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">サブスクリプション</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            登録済みサブスクの管理
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <CategoryManager />
          <PaymentMethodManager />
          <CSVImport open={csvOpen} onOpenChange={setCsvOpen} />
          <Button onClick={() => setAddOpen(true)} size="sm" className="h-9">
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">サービスを追加</span>
          </Button>
        </div>
      </div>

      {/* Subscription list */}
      <SubscriptionTable />

      {/* Add modal */}
      <SubscriptionModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
