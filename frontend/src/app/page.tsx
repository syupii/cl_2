'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function RootPage() {
  const router = useRouter()
  const { session, loading } = useAuth()

  useEffect(() => {
    // PWA / ブラウザいずれのエントリでもまず URL パラメータを確認し、
    // Supabase のパスワード復旧 (?code=... / #type=recovery) を取りこぼさない。
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const hash = window.location.hash

    if (code) {
      router.replace(`/reset-password?code=${code}`)
      return
    }
    if (hash.includes('type=recovery')) {
      router.replace(`/reset-password${hash}`)
      return
    }

    // セッション判定が終わってから行き先を決める。ここを早まって
    // /dashboard に replace すると、iOS ホーム画面から PWA を起動した際に
    // ストレージが空で localStorage にセッションが無い場合、すぐ /login へ
    // 再リダイレクトすることになり iOS 標準の「このページを読み込めません」
    // 画面を招く。
    if (loading) return
    router.replace(session ? '/dashboard' : '/login')
  }, [router, session, loading])

  // 常に何かしらの HTML を返す — 空レスポンス + JS リダイレクトだと
  // iOS PWA standalone モードでエラー画面になりやすい。
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
