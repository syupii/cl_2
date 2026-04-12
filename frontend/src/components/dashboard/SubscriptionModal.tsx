'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useCreateSubscription, useUpdateSubscription, useSubscriptions } from '@/hooks/useSubscriptions'
import { useTemplates } from '@/hooks/useTemplates'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'
import { useCategories } from '@/hooks/useCategories'
import type { SubscriptionDTO, PlanDTO, TemplateDTO } from '@/lib/api-client'

// ── Zod schema ─────────────────────────────────────────────────────────────

const schema = z.object({
  service_name: z.string().min(1, 'サービス名を入力してください'),
  plan_name: z.string().optional(),
  price: z.string().min(1, '料金を入力してください'),
  currency: z.string().min(1),
  billing_cycle: z.enum(['monthly', 'yearly']),
  next_billing_date: z.string().min(1, '次回請求日を入力してください'),
  category: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'cancelled']).optional(),
})

type FormValues = z.infer<typeof schema>

// ── Props ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: SubscriptionDTO | null
}

// ── Component ───────────────────────────────────────────────────────────────

type Step = 'template-select' | 'form'

export function SubscriptionModal({ open, onOpenChange, editData }: Props) {
  // In edit mode we go straight to the form; in create mode we start at
  // the template picker.
  const [step, setStep] = useState<Step>(editData ? 'form' : 'template-select')

  const { data: templates = [] } = useTemplates()
  const { data: existingSubs = [] } = useSubscriptions()
  const createMutation = useCreateSubscription()

  const { data: dbPaymentMethods = [] } = usePaymentMethods()
  const { categories: predefinedCategories } = useCategories()

  // DB登録済み + 過去入力履歴をマージして候補リストを生成
  const paymentMethodsFromHistory = [...new Set(
    existingSubs.map((s) => s.payment_method).filter((v): v is string => !!v)
  )]
  const paymentMethods = [...new Set([
    ...dbPaymentMethods.map((m) => m.name),
    ...paymentMethodsFromHistory,
  ])]
  // 事前登録カテゴリ + 既存サブスクから使用中カテゴリをマージ
  const usedCategories = existingSubs.map((s) => s.category).filter((v): v is string => !!v)
  const categories = [...new Set([...predefinedCategories, ...usedCategories])].sort()
  const updateMutation = useUpdateSubscription()
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editData
      ? {
          service_name: editData.service_name ?? '',
          plan_name: editData.plan_name ?? '',
          price: editData.price ?? '',
          currency: editData.currency ?? 'JPY',
          billing_cycle: editData.billing_cycle as 'monthly' | 'yearly' ?? 'monthly',
          next_billing_date: editData.next_billing_date ?? '',
          category: editData.category ?? '',
          payment_method: editData.payment_method ?? '',
          notes: editData.notes ?? '',
          status: editData.status as 'active' | 'cancelled' ?? 'active',
        }
      : {
          currency: 'JPY',
          billing_cycle: 'monthly',
          status: 'active',
        },
  })

  // Reset on open/close so re-opening starts fresh.
  useEffect(() => {
    if (!open) {
      reset()
      setStep(editData ? 'form' : 'template-select')
    }
  }, [open, editData, reset])

  // ── Template selection ────────────────────────────────────────────────────

  function applyTemplate(tpl: TemplateDTO) {
    setValue('service_name', tpl.name ?? '')
    setStep('form')
  }

  function applyPlan(plan: PlanDTO) {
    setValue('price', plan.default_price ?? '')
    setValue('currency', plan.currency ?? 'JPY')
    setValue('billing_cycle', (plan.billing_cycle as 'monthly' | 'yearly') ?? 'monthly')
    setValue('plan_name', plan.plan_name ?? '')
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    try {
      if (editData) {
        await updateMutation.mutateAsync({
          id: editData.id!,
          body: {
            service_name: values.service_name,
            plan_name: values.plan_name || undefined,
            price: values.price,
            currency: values.currency,
            billing_cycle: values.billing_cycle,
            next_billing_date: values.next_billing_date,
            category: values.category || undefined,
            payment_method: values.payment_method || undefined,
            notes: values.notes || undefined,
            status: values.status ?? 'active',
          },
        })
        toast.success('サブスクリプションを更新しました')
      } else {
        await createMutation.mutateAsync({
          service_name: values.service_name,
          plan_name: values.plan_name || undefined,
          price: values.price,
          currency: values.currency,
          billing_cycle: values.billing_cycle,
          next_billing_date: values.next_billing_date,
          category: values.category || undefined,
          payment_method: values.payment_method || undefined,
          notes: values.notes || undefined,
        })
        toast.success('サブスクリプションを追加しました')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存に失敗しました')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Find the template matching the current service_name (for plan list).
  const currentServiceName = watch('service_name')
  const matchedTemplate = currentServiceName
    ? templates.find((t) => t.name?.toLowerCase() === currentServiceName.toLowerCase())
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'サブスクリプションを編集' : 'サービスを追加'}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: テンプレート選択 ─────────────────────────────── */}
        {step === 'template-select' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              よく使われるサービスからテンプレートを選んでください。
              手動で入力する場合は「手動で入力」を押してください。
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  className="flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors hover:bg-accent"
                  onClick={() => applyTemplate(tpl)}
                >
                  {tpl.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tpl.icon_url}
                      alt={tpl.name}
                      className="h-8 w-8 rounded object-contain"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-lg">
                      {tpl.name?.slice(0, 1)}
                    </div>
                  )}
                  <span className="text-center leading-tight">{tpl.name}</span>
                </button>
              ))}
            </div>
            <Separator />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setStep('form')}
            >
              手動で入力
            </Button>
          </div>
        )}

        {/* ── Step 2: 入力フォーム ─────────────────────────────────── */}
        {step === 'form' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!editData && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setStep('template-select')}
              >
                <ChevronLeft className="h-3 w-3" />
                テンプレートに戻る
              </button>
            )}

            {/* サービス名 */}
            <div className="space-y-1">
              <Label htmlFor="service_name">サービス名 *</Label>
              <Input id="service_name" {...register('service_name')} placeholder="Netflix" />
              {errors.service_name && (
                <p className="text-xs text-destructive">{errors.service_name.message}</p>
              )}
            </div>

            {/* テンプレートのプラン選択 */}
            {matchedTemplate && matchedTemplate.plans && matchedTemplate.plans.length > 0 && (
              <div className="space-y-1">
                <Label>プランを選択（任意）</Label>
                <div className="flex flex-wrap gap-2">
                  {matchedTemplate.plans.map((plan) => (
                    <Badge
                      key={plan.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => applyPlan(plan)}
                    >
                      {plan.plan_name} — {plan.default_price} {plan.currency}/
                      {plan.billing_cycle === 'yearly' ? '年' : '月'}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  クリックで料金を自動入力します
                </p>
              </div>
            )}

            {/* プラン名 */}
            <div className="space-y-1">
              <Label htmlFor="plan_name">プラン名</Label>
              <Input id="plan_name" {...register('plan_name')} placeholder="Premium" />
            </div>

            {/* 料金 + 通貨 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="price">料金 *</Label>
                <Input
                  id="price"
                  {...register('price')}
                  placeholder="2290"
                  type="text"
                  inputMode="decimal"
                />
                {errors.price && (
                  <p className="text-xs text-destructive">{errors.price.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="currency">通貨</Label>
                <Select
                  defaultValue={watch('currency') ?? 'JPY'}
                  onValueChange={(v) => { if (v !== null) setValue('currency', v) }}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 支払い周期 */}
            <div className="space-y-1">
              <Label>支払い周期</Label>
              <Select
                defaultValue={watch('billing_cycle') ?? 'monthly'}
                onValueChange={(v) => { if (v !== null) setValue('billing_cycle', v as 'monthly' | 'yearly') }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">毎月払い</SelectItem>
                  <SelectItem value="yearly">年払い（月額÷12で計算）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 次回請求日 */}
            <div className="space-y-1">
              <Label htmlFor="next_billing_date">次回請求日 *</Label>
              <Input
                id="next_billing_date"
                type="date"
                {...register('next_billing_date')}
              />
              {errors.next_billing_date && (
                <p className="text-xs text-destructive">{errors.next_billing_date.message}</p>
              )}
            </div>

            {/* カテゴリ */}
            <div className="space-y-1">
              <Label htmlFor="category">カテゴリ</Label>
              <Input
                id="category"
                {...register('category')}
                placeholder="Entertainment, Music, Software…"
                list="category-list"
              />
              <datalist id="category-list">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            {/* 決済手段 */}
            <div className="space-y-1">
              <Label htmlFor="payment_method">決済手段</Label>
              <Input
                id="payment_method"
                {...register('payment_method')}
                placeholder="Visa ****1234"
                list="payment-method-list"
              />
              <datalist id="payment-method-list">
                {paymentMethods.map((p) => <option key={p} value={p} />)}
              </datalist>
            </div>

            {/* メモ */}
            <div className="space-y-1">
              <Label htmlFor="notes">メモ</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="家族プラン、会社経費など"
                rows={2}
                className="resize-none"
              />
            </div>

            {/* ステータス（編集時のみ） */}
            {editData && (
              <div className="space-y-1">
                <Label>ステータス</Label>
                <Select
                  defaultValue={watch('status') ?? 'active'}
                  onValueChange={(v) => { if (v !== null) setValue('status', v as 'active' | 'cancelled') }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">有効</SelectItem>
                    <SelectItem value="cancelled">解約済み</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? '保存中…' : editData ? '更新する' : '追加する'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
