'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, LayoutDashboard, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard', label: 'ダッシュボード', Icon: LayoutDashboard },
  { href: '/dashboard/calendar', label: 'カレンダー', Icon: CalendarDays },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { session, loading } = useAuth()

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login')
    }
  }, [loading, session, router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    toast.success('ログアウトしました')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="flex min-h-screen flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <span className="font-semibold">サブスク管理</span>
            <nav className="flex items-center gap-1">
              {NAV.map(({ href, label, Icon }) => {
                const active = pathname === href
                return (
                  <a
                    key={href}
                    href={href}
                    className={[
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-accent font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </a>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {session.user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-1 h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>

      <Separator />
      <footer className="py-4 text-center text-xs text-muted-foreground">
        サブスク管理ダッシュボード
      </footer>
    </div>
  )
}
