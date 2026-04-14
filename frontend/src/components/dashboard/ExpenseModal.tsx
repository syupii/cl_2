'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
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
import { Badge } from '@/components/ui/badge'
import { useCreateSubscription, useUpdateSubscription } from '@/hooks/useSubscriptions'
import { STORAGE_KEYS } from '@/lib/constants'
import { EXPENSE_TAG } from '@/lib/utils'
import type { SubscriptionDTO } from '@/lib/api-client'

// よく使う支出カテゴリのプリセット
const PRESET_CATEGORIES = ['住居費', '光熱費', '食費', '交通費', '保険', '医療費', '教育費', '交際費', '趣味・娯楽', 'その他']

const schema = z.object({
  service_name: z.string().min(1, '支出名を入力してください'),
  price: z.string().min(1, '金額を入力してください'),
  billing_cycle: z.enum(['monthly', 'yearly', 'once']),
  next_billing_date: z.string().min(1, '支払い予定日を入力してください'),
  category: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: SubscriptionDTO | null
}

export function ExpenseModal({ open, onOpenChange, editData }: Props) {
  const createMutation = useCreateSubscription()
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
          price: editData.price ?? '',
          billing_cycle: (editData.billing_cycle ?? 'monthly') as 'monthly' | 'yearly' | 'once',
          next_billing_date: editData.next_billing_date ?? '',
          category: editData.category ?? '',
          notes: editData.notes ?? '',
        }
      : {
          billing_cycle: 'monthly',
        },
  })

  useEffect(() => {
    if (open && editData) {
      reset({
        service_name: editData.service_name ?? '',
        price: editData.price ?? '',
        billing_cycle: (editData.billing_cycle ?? 'monthly') as 'monthly' | 'yearly' | 'once',
        next_billing_date: editData.next_billing_date ?? '',
        category: editData.category ?? '',
        notes: editData.notes ?? '',
      })
    } else if (!open) {
      reset()
    }
  }, [open, editData, reset])

  // localStorage から事前登録カテゴリを読み込み、プリセットとマージ
  const [allCategories, setAllCategories] = useState<string[]>(PRESET_CATEGORIES)
  useEffect(() => {
    if (!open) return
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PREDEFINED_CATEGORIES)
      const custom = saved ? (JSON.parse(saved) as string[]) : []
      const merged = [...new Set([...PRESET_CATEGORIES, ...custom])].sort()
      setAllCategories(merged)
    } catch {
      setAllCategories(PRESET_CATEGORIES)
    }
  }, [open])

  const currentCategory = watch('category')

  async function onSubmit(values: FormValues) {
    try {
      if (editData) {
        await updateMutation.mutateAsync({
          id: editData.id!,
          body: {
            service_name: values.service_name,
            plan_name: EXPENSE_TAG,
            price: values.price,
            currency: 'JPY',
            billing_cycle: values.billing_cycle,
            next_billing_date: values.next_billing_date,
            category: values.category || undefined,
            notes: values.notes || undefined,
            status: editData.status as 'active' | 'cancelled',
          },
        })
        toast.success('支出を更新しました')
      } else {
        await createMutation.mutateAsync({
          service_name: values.service_name,
          plan_name: EXPENSE_TAG,
          price: values.price,
          currency: 'JPY',
          billing_cycle: values.billing_cycle,
          next_billing_date: values.next_billing_date,
          category: values.category || undefined,
          notes: values.notes || undefined,
        })
        toast.success('支出を追加しました')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存に失敗しました')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? '支出を編集' : '支出を追加'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 支出名 */}
          <div className="space-y-1">
            <Label htmlFor="service_name">支出名 *</Label>
            <Input id="service_name" {...register('service_name')} placeholder="家賃、電気代、保険料…" />
            {errors.service_name && (
              <p className="text-xs text-destructive">{errors.service_name.message}</p>
            )}
          </div>

          {/* 金額 */}
          <div className="space-y-1">
            <Label htmlFor="price">金額（円） *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="price"
                {...register('price')}
                placeholder="80000"
                type="text"
                inputMode="numeric"
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground shrink-0">円</span>
            </div>
            {errors.price && (
              <p className="text-xs text-destructive">{errors.price.message}</p>
            )}
          </div>

          {/* 支払い周期 */}
          <div className="space-y-1">
            <Label>支払い周期</Label>
            <Select
              value={watch('billing_cycle') ?? 'monthly'}
              onValueChange={(v) => { if (v) setValue('billing_cycle', v as 'monthly' | 'yearly' | 'once') }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">毎月払い</SelectItem>
                <SelectItem value="yearly">年払い（月額÷12で計算）</SelectItem>
                <SelectItem value="once">一回払い（月次集計に含めない）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 支払い予定日 */}
          <div className="space-y-1">
            <Label htmlFor="next_billing_date">支払い予定日 *</Label>
            <Input id="next_billing_date" type="date" {...register('next_billing_date')} />
            {errors.next_billing_date && (
              <p className="text-xs text-destructive">{errors.next_billing_date.message}</p>
            )}
          </div>

          {/* カテゴリ */}
          <div className="space-y-1">
            <Label htmlFor="category">カテゴリ</Label>
            <div className="flex flex-wrap gap-1.5">
              {allCategories.map((c) => (
                <Badge
                  key={c}
                  variant={currentCategory === c ? 'default' : 'outline'}
                  className="cursor-pointer select-none"
                  onClick={() => setValue('category', currentCategory === c ? '' : c)}
                >
                  {c}
                </Badge>
              ))}
            </div>
            <Input
              id="category"
              {...register('category')}
              placeholder="または自由入力…"
            />
          </div>

          {/* メモ */}
          <div className="space-y-1">
            <Label htmlFor="notes">メモ</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="備考など"
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? '保存中…' : editData ? '更新する' : '追加する'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

