'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'signup'

interface Props {
  mode: Mode
}

/** Translate Supabase Auth error messages to Japanese. */
function toJapanese(message: string): string {
  if (/user already registered/i.test(message))
    return 'このメールアドレスはすでに登録されています'
  if (/invalid login credentials/i.test(message))
    return 'メールアドレスまたはパスワードが正しくありません'
  if (/email not confirmed/i.test(message))
    return 'メールアドレスの確認が完了していません。届いたメールのリンクをクリックしてください'
  if (/password should be at least/i.test(message))
    return 'パスワードは6文字以上で入力してください'
  if (/rate limit/i.test(message))
    return 'しばらく時間をおいてから再度お試しください'
  if (/invalid email/i.test(message))
    return '有効なメールアドレスを入力してください'
  if (/email rate limit exceeded/i.test(message))
    return 'メール送信の上限に達しました。しばらく時間をおいてから再度お試しください'
  return message
}

export function AuthForm({ mode }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('ログインしました')
        router.push('/dashboard')
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // When email confirmation is ON, Supabase hides duplicate errors for
        // security. Duplicate signups return an empty identities array instead.
        if (data.user?.identities?.length === 0) {
          setFormError('このメールアドレスはすでに登録されています')
          return
        }
        toast.success('確認メールを送信しました。メールをご確認ください。')
      }
    } catch (err) {
      const msg = err instanceof Error ? toJapanese(err.message) : '認証エラーが発生しました'
      setFormError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{mode === 'login' ? 'ログイン' : 'アカウント作成'}</CardTitle>
        <CardDescription>
          {mode === 'login'
            ? 'メールアドレスとパスワードでログインしてください'
            : 'メールアドレスとパスワードを設定してください'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFormError(null) }}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFormError(null) }}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {/* Inline error */}
          {formError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? '処理中…'
              : mode === 'login'
              ? 'ログイン'
              : 'アカウントを作成'}
          </Button>
          {mode === 'login' && (
            <div className="text-right">
              <a
                href="/forgot-password"
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                パスワードを忘れた方はこちら
              </a>
            </div>
          )}
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === 'login' ? 'アカウントをお持ちでない方は' : 'すでにアカウントをお持ちの方は'}
          {' '}
          <a
            href={mode === 'login' ? '/signup' : '/login'}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {mode === 'login' ? 'アカウント作成' : 'ログイン'}
          </a>
        </p>
      </CardContent>
    </Card>
  )
}
