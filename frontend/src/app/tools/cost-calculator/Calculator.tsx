'use client'

import { useMemo, useState } from 'react'

// Reference rates mirror the backend defaults (see backend/internal/config/config.go).
// These are intentionally static so the tool renders without any API call and
// stays crawlable as pure HTML. Update alongside the backend's defaultFXRates.
const FX_RATES_JPY: Record<string, number> = {
  JPY: 1,
  USD: 150,
  EUR: 162,
  GBP: 190,
}

type Cycle = 'monthly' | 'yearly'
type Currency = keyof typeof FX_RATES_JPY

const YEN = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

export function Calculator() {
  const [price, setPrice] = useState('2290')
  const [currency, setCurrency] = useState<Currency>('JPY')
  const [cycle, setCycle] = useState<Cycle>('monthly')

  const results = useMemo(() => {
    const raw = parseFloat(price)
    if (!Number.isFinite(raw) || raw < 0) return null
    const rate = FX_RATES_JPY[currency] ?? 1
    const priceJPY = raw * rate
    const monthly = cycle === 'yearly' ? priceJPY / 12 : priceJPY
    const yearly = monthly * 12
    return {
      monthly,
      yearly,
      twoYears: yearly * 2,
      fiveYears: yearly * 5,
      tenYears: yearly * 10,
    }
  }, [price, currency, cycle])

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">料金</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
            aria-label="料金"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">通貨</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="h-10 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
            aria-label="通貨"
          >
            {Object.keys(FX_RATES_JPY).map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">支払い周期</span>
          <select
            value={cycle}
            onChange={(e) => setCycle(e.target.value as Cycle)}
            className="h-10 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
            aria-label="支払い周期"
          >
            <option value="monthly">毎月払い</option>
            <option value="yearly">年払い</option>
          </select>
        </label>
      </div>

      {results ? (
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="月額 (JPY)" value={YEN.format(results.monthly)} emphasis />
          <Stat label="年間 (JPY)" value={YEN.format(results.yearly)} />
          <Stat label="2 年間累計" value={YEN.format(results.twoYears)} />
          <Stat label="5 年間累計" value={YEN.format(results.fiveYears)} />
          <Stat label="10 年間累計" value={YEN.format(results.tenYears)} />
        </dl>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          料金に正の数値を入力してください。
        </p>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        為替レートは参考値 (USD=150, EUR=162, GBP=190 円) です。実際の請求額は
        カード会社レートにより前後します。
      </p>
    </div>
  )
}

function Stat({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded-lg border bg-background px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={emphasis ? 'mt-1 text-2xl font-bold' : 'mt-1 text-lg font-semibold'}>
        {value}
      </dd>
    </div>
  )
}
