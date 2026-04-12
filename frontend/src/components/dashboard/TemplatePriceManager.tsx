'use client'

import { useState } from 'react'
import { Tag, Pencil, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTemplates, useUpdatePlanPrice } from '@/hooks/useTemplates'
import type { PlanDTO, TemplateDTO } from '@/lib/api-client'

const CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP', 'AUD', 'CAD']

// ── Single plan row with inline editing ──────────────────────────────────────

function PlanRow({ plan }: { plan: PlanDTO }) {
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(plan.default_price ?? '')
  const [currency, setCurrency] = useState(plan.currency ?? 'JPY')
  const mutation = useUpdatePlanPrice()

  async function save() {
    if (!price || isNaN(Number(price))) {
      toast.error('正しい金額を入力してください')
      return
    }
    try {
      await mutation.mutateAsync({ id: plan.id!, price, currency })
      toast.success('価格を更新しました')
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました')
    }
  }

  function cancel() {
    setPrice(plan.default_price ?? '')
    setCurrency(plan.currency ?? 'JPY')
    setEditing(false)
  }

  const cycleLabel = plan.billing_cycle === 'yearly' ? '年払い' : '月払い'

  return (
    <div className="flex items-center gap-2 py-1.5 pl-6 text-sm">
      <span className="w-48 truncate text-muted-foreground">{plan.plan_name}</span>
      <span className="w-16 text-xs text-muted-foreground">{cycleLabel}</span>

      {editing ? (
        <>
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-7 w-24 text-sm"
            type="number"
            min={0}
            autoFocus
          />
          <Select value={currency} onValueChange={(v) => { if (v) setCurrency(v) }}>
            <SelectTrigger className="h-7 w-20 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon" variant="ghost" className="h-7 w-7 text-green-600"
            onClick={save} disabled={mutation.isPending}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <>
          <span className="w-24 font-medium">
            {plan.default_price} <span className="text-xs font-normal text-muted-foreground">{plan.currency}</span>
          </span>
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  )
}

// ── Template section with collapsible plans ───────────────────────────────────

function TemplateSection({ template }: { template: TemplateDTO }) {
  const [open, setOpen] = useState(false)
  const plans = template.plans ?? []

  return (
    <div className="border-b last:border-0">
      <button
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        {template.icon_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={template.icon_url} alt="" className="h-5 w-5 rounded object-contain" />
        )}
        <span>{template.name}</span>
        <span className="ml-auto text-xs text-muted-foreground">{plans.length}プラン</span>
      </button>

      {open && (
        <div className="bg-muted/20 px-2 pb-2">
          <div className="flex items-center gap-2 py-1 pl-6 text-xs font-medium text-muted-foreground">
            <span className="w-48">プラン名</span>
            <span className="w-16">周期</span>
            <span className="w-24">金額</span>
          </div>
          {plans.map((p) => (
            <PlanRow key={p.id} plan={p} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared content (used by both modal and inline modes) ─────────────────────

function TemplatePriceContent() {
  const { data: templates = [], isLoading } = useTemplates()
  const [search, setSearch] = useState('')

  const filtered = templates.filter((t) =>
    t.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="サービス名で検索..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="rounded-lg border overflow-y-auto max-h-[60vh]">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            サービスが見つかりません
          </p>
        ) : (
          filtered.map((t) => <TemplateSection key={t.id} template={t} />)
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        ✏️ プラン行の鉛筆アイコンで価格を編集できます。変更は即座にDBに保存されます。
      </p>
    </div>
  )
}

// ── Main: modal trigger (dashboard) or inline (admin page) ───────────────────

export function TemplatePriceManager({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(false)

  if (inline) {
    return <TemplatePriceContent />
  }

  return (
    <>
      <Button
        variant="outline" size="sm"
        className="h-9 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Tag className="h-4 w-4" />
        <span className="hidden sm:inline">価格管理</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>テンプレート価格管理</DialogTitle>
          </DialogHeader>
          <TemplatePriceContent />
        </DialogContent>
      </Dialog>
    </>
  )
}
