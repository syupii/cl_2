'use client'

import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'dashboard_widgets'

export interface WidgetConfig {
  alerts: boolean
  kpi: boolean
  charts: boolean
}

const DEFAULT_CONFIG: WidgetConfig = {
  alerts: true,
  kpi: true,
  charts: true,
}

export function loadWidgetConfig(): WidgetConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

const LABELS: { key: keyof WidgetConfig; label: string }[] = [
  { key: 'alerts', label: '請求アラートバナー' },
  { key: 'kpi', label: 'KPIカード' },
  { key: 'charts', label: 'グラフ（円・棒）' },
]

interface Props {
  config: WidgetConfig
  onChange: (config: WidgetConfig) => void
}

export function DashboardSettings({ config, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function toggle(key: keyof WidgetConfig) {
    const next = { ...config, [key]: !config[key] }
    onChange(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        title="ウィジェット表示設定"
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-52 rounded-lg border bg-popover p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">表示するウィジェット</p>
          <div className="space-y-2">
            {LABELS.map(({ key, label }) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config[key]}
                  onChange={() => toggle(key)}
                  className="h-4 w-4 rounded border"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
