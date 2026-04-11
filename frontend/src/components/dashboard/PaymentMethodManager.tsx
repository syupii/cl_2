'use client'

import { useState } from 'react'
import { Plus, Trash2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePaymentMethods, useCreatePaymentMethod, useDeletePaymentMethod } from '@/hooks/usePaymentMethods'

export function PaymentMethodManager() {
  const { data: methods = [], isLoading } = usePaymentMethods()
  const createMutation = useCreatePaymentMethod()
  const deleteMutation = useDeletePaymentMethod()
  const [newName, setNewName] = useState('')
  const [open, setOpen] = useState(false)

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    try {
      await createMutation.mutateAsync(name)
      setNewName('')
      toast.success('決済手段を追加しました')
    } catch {
      toast.error('追加に失敗しました')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('削除しました')
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setOpen(true)}>
        <CreditCard className="h-3.5 w-3.5" />
        決済手段を管理
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>決済手段の管理</DialogTitle>
          </DialogHeader>

          {/* 新規追加 */}
          <div className="flex gap-2">
            <Input
              placeholder="例: Visa ****1234"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            />
            <Button
              size="icon"
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 一覧 */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">読み込み中…</p>
            ) : methods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                決済手段が登録されていません
              </p>
            ) : (
              methods.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm">{m.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(m.id, m.name)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
