'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { TemplatePriceManager } from '@/components/dashboard/TemplatePriceManager'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase()

export default function AdminPage() {
  const { session, loading } = useAuth()
  const router = useRouter()

  const isAdmin = !!ADMIN_EMAIL && session?.user.email?.toLowerCase() === ADMIN_EMAIL

  useEffect(() => {
    if (loading) return
    if (!session) {
      router.replace('/login')
      return
    }
    if (!isAdmin) {
      router.replace('/dashboard')
    }
  }, [loading, session, isAdmin, router])

  if (loading || !isAdmin) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">管理者設定</h1>
          <p className="text-sm text-muted-foreground">テンプレート価格などの管理者専用設定</p>
        </div>
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">テンプレート価格管理</h2>
        <p className="text-sm text-muted-foreground">
          サービステンプレートのデフォルト価格を更新します。
          変更は即座にデータベースに反映され、全ユーザーのサービス追加モーダルに表示されます。
        </p>
        <TemplatePriceManager inline />
      </div>
    </div>
  )
}
