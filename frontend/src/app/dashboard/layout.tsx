'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, LayoutDashboard, CalendarDays, Sun, Moon, ShieldCheck, Wallet, CreditCard } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { NotificationPanel } from '@/components/dashboard/NotificationPanel'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase()

const NAV = [
  { href: '/dashboard', label: 'ダッシュボード', Icon: LayoutDashboard },
  { href: '/dashboard/subscriptions', label: 'サブスク', Icon: CreditCard },
  { href: '/dashboard/budget', label: '支出', Icon: Wallet },
  { href: '/dashboard/calendar', label: 'カレンダー', Icon: CalendarDays },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-8 w-8" />
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { session, loading } = useAuth()
  const isAdmin = !!ADMIN_EMAIL && session?.user.email?.toLowerCase() === ADMIN_EMAIL

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
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="font-semibold text-sm sm:text-base">家計・サブスク管理</span>
            <nav className="flex items-center gap-0.5">
              {NAV.map(({ href, label, Icon }) => {
                const active = pathname === href
                return (
                  <a
                    key={href}
                    href={href}
                    className={[
                      'flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm transition-colors',
                      active
                        ? 'bg-accent font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </a>
                )
              })}
              {isAdmin && (
                <a
                  href="/dashboard/admin"
                  className={[
                    'flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm transition-colors',
                    pathname === '/dashboard/admin'
                      ? 'bg-accent font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  ].join(' ')}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">管理</span>
                </a>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-1">
            <NotificationPanel />
            <ThemeToggle />
            <span className="hidden text-sm text-muted-foreground sm:block">
              {session.user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">ログアウト</span>
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
        家計・サブスク管理ダッシュボード
      </footer>
    </div>
  )
}
