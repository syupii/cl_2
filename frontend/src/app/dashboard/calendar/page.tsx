import { BillingCalendar } from '@/components/dashboard/BillingCalendar'

export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">請求カレンダー</h1>
        <p className="text-sm text-muted-foreground">次回請求日をカレンダーで確認</p>
      </div>
      <BillingCalendar />
    </div>
  )
}
