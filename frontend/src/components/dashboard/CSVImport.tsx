'use client'

import { useRef, useState } from 'react'
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCreateSubscription } from '@/hooks/useSubscriptions'
import type { CreateSubscriptionRequest } from '@/lib/api-client'

// ── CSV parsing ──────────────────────────────────────────────────────────────

// Map both Japanese and English header names to internal field names.
const HEADER_MAP: Record<string, string> = {
  // Japanese
  'サービス名': 'service_name',
  'プラン名': 'plan_name',
  '料金': 'price',
  '通貨': 'currency',
  '支払い周期': 'billing_cycle',
  '次回請求日': 'next_billing_date',
  'カテゴリ': 'category',
  '決済手段': 'payment_method',
  'メモ': 'notes',
  // English
  'service_name': 'service_name',
  'plan_name': 'plan_name',
  'price': 'price',
  'currency': 'currency',
  'billing_cycle': 'billing_cycle',
  'next_billing_date': 'next_billing_date',
  'category': 'category',
  'payment_method': 'payment_method',
  'notes': 'notes',
}

const BILLING_CYCLE_MAP: Record<string, 'monthly' | 'yearly'> = {
  monthly: 'monthly',
  yearly: 'yearly',
  '月払い': 'monthly',
  '毎月払い': 'monthly',
  '年払い': 'yearly',
  '毎年払い': 'yearly',
}

interface ParsedRow {
  raw: Record<string, string>
  data: CreateSubscriptionRequest | null
  errors: string[]
  rowIndex: number
}

function parseCSV(text: string): ParsedRow[] {
  // Detect delimiter (comma or tab)
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  const delimiter = lines[0].includes('\t') ? '\t' : ','

  function splitLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const rawHeaders = splitLine(lines[0])
  const headers = rawHeaders.map((h) => HEADER_MAP[h.trim()] ?? h.trim())

  return lines.slice(1).map((line, idx) => {
    const values = splitLine(line)
    const raw: Record<string, string> = {}
    headers.forEach((h, i) => { raw[h] = values[i] ?? '' })

    const errors: string[] = []

    const serviceName = raw['service_name']?.trim()
    if (!serviceName) errors.push('サービス名は必須です')

    const price = raw['price']?.trim()
    if (!price || isNaN(parseFloat(price))) errors.push('料金が無効です')

    const currency = (raw['currency']?.trim() || 'JPY').toUpperCase()
    if (!['JPY', 'USD', 'EUR', 'GBP'].includes(currency)) errors.push(`通貨「${currency}」は非対応です`)

    const rawCycle = (raw['billing_cycle']?.trim() || 'monthly').toLowerCase()
    const billing_cycle = BILLING_CYCLE_MAP[raw['billing_cycle']?.trim()] ?? BILLING_CYCLE_MAP[rawCycle]
    if (!billing_cycle) errors.push(`支払い周期「${raw['billing_cycle']}」は無効です`)

    const next_billing_date = raw['next_billing_date']?.trim()
    if (!next_billing_date || !/^\d{4}-\d{2}-\d{2}$/.test(next_billing_date)) {
      errors.push('次回請求日は YYYY-MM-DD 形式で入力してください')
    }

    if (errors.length > 0) return { raw, data: null, errors, rowIndex: idx + 2 }

    return {
      raw,
      errors: [],
      rowIndex: idx + 2,
      data: {
        service_name: serviceName!,
        plan_name: raw['plan_name']?.trim() || undefined,
        price: price!,
        currency,
        billing_cycle: billing_cycle!,
        next_billing_date: next_billing_date!,
        category: raw['category']?.trim() || undefined,
        payment_method: raw['payment_method']?.trim() || undefined,
        notes: raw['notes']?.trim() || undefined,
      },
    }
  })
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportState = 'idle' | 'previewing' | 'importing' | 'done'

export function CSVImport({ open, onOpenChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [state, setState] = useState<ImportState>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 })
  const createMutation = useCreateSubscription()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      setRows(parsed)
      setState('previewing')
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  async function handleImport() {
    const valid = rows.filter((r) => r.data !== null)
    if (valid.length === 0) return
    setState('importing')
    setProgress({ done: 0, total: valid.length, failed: 0 })
    let failed = 0
    for (const row of valid) {
      try {
        await createMutation.mutateAsync(row.data!)
      } catch {
        failed++
      }
      setProgress((p) => ({ ...p, done: p.done + 1, failed }))
    }
    setState('done')
    const succeeded = valid.length - failed
    if (succeeded > 0) toast.success(`${succeeded}件のサブスクをインポートしました`)
    if (failed > 0) toast.error(`${failed}件のインポートに失敗しました`)
  }

  function reset() {
    setRows([])
    setState('idle')
    setProgress({ done: 0, total: 0, failed: 0 })
  }

  const validCount = rows.filter((r) => r.data !== null).length
  const errorCount = rows.filter((r) => r.errors.length > 0).length

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => onOpenChange(true)}>
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">CSVインポート</span>
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>CSVインポート</DialogTitle>
          </DialogHeader>

          {/* ── Idle: file picker ── */}
          {state === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                CSV ファイルを選択してください。ヘッダー行が必要です。
              </p>
              <div className="rounded-lg border-2 border-dashed p-6 text-center">
                <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="mb-2 text-sm font-medium">CSVファイルを選択</p>
                <p className="mb-4 text-xs text-muted-foreground">
                  対応ヘッダー: サービス名・料金・通貨・支払い周期・次回請求日（必須）
                  <br />
                  プラン名・カテゴリ・決済手段・メモ（任意）
                </p>
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  ファイルを選択
                </Button>
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />
              </div>
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">CSVサンプルを見る</summary>
                <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
{`サービス名,料金,通貨,支払い周期,次回請求日,プラン名,カテゴリ
Netflix,1490,JPY,monthly,2026-05-01,スタンダード,動画
Spotify,980,JPY,monthly,2026-05-15,,音楽
Adobe CC,72336,JPY,yearly,2026-08-01,コンプリート,ソフト`}
                </pre>
              </details>
            </div>
          )}

          {/* ── Previewing ── */}
          {state === 'previewing' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-600 font-medium">✓ {validCount}件 インポート可</span>
                {errorCount > 0 && (
                  <span className="text-destructive font-medium">✕ {errorCount}件 エラー</span>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">行</th>
                      <th className="px-3 py-2 text-left font-medium">サービス名</th>
                      <th className="px-3 py-2 text-left font-medium">料金</th>
                      <th className="px-3 py-2 text-left font-medium">周期</th>
                      <th className="px-3 py-2 text-left font-medium">次回請求日</th>
                      <th className="px-3 py-2 text-left font-medium">状態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => (
                      <tr key={row.rowIndex} className={row.errors.length > 0 ? 'bg-destructive/5' : ''}>
                        <td className="px-3 py-2 text-muted-foreground">{row.rowIndex}</td>
                        <td className="px-3 py-2 font-medium">{row.raw['service_name'] || '—'}</td>
                        <td className="px-3 py-2">{row.raw['price']} {row.raw['currency'] || 'JPY'}</td>
                        <td className="px-3 py-2">{row.raw['billing_cycle'] || '—'}</td>
                        <td className="px-3 py-2">{row.raw['next_billing_date'] || '—'}</td>
                        <td className="px-3 py-2">
                          {row.errors.length > 0 ? (
                            <span className="flex items-center gap-1 text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              {row.errors[0]}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={reset}>
                  やり直し
                </Button>
                <Button
                  className="flex-1"
                  disabled={validCount === 0}
                  onClick={handleImport}
                >
                  {validCount}件をインポート
                </Button>
              </div>
            </div>
          )}

          {/* ── Importing ── */}
          {state === 'importing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">インポート中…</p>
              <p className="text-xs text-muted-foreground">
                {progress.done} / {progress.total} 件処理済み
                {progress.failed > 0 && `（${progress.failed}件失敗）`}
              </p>
              <div className="w-full rounded-full bg-muted h-2">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {state === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <p className="text-sm font-medium">インポート完了</p>
              <p className="text-xs text-muted-foreground">
                {progress.total - progress.failed}件成功
                {progress.failed > 0 && `・${progress.failed}件失敗`}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>続けてインポート</Button>
                <Button onClick={() => { reset(); onOpenChange(false) }}>閉じる</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
