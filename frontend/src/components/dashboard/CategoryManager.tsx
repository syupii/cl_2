'use client'

import { useState } from 'react'
import { Plus, Trash2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCategories } from '@/hooks/useCategories'

export function CategoryManager() {
  const { categories, addCategory, removeCategory } = useCategories()
  const [newName, setNewName] = useState('')
  const [open, setOpen] = useState(false)

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    if (categories.includes(name)) {
      toast.error('同じ名前のカテゴリがすでにあります')
      return
    }
    addCategory(name)
    setNewName('')
    toast.success(`「${name}」を追加しました`)
  }

  function handleRemove(name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return
    removeCategory(name)
    toast.success('削除しました')
  }

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setOpen(true)}>
        <Tag className="h-4 w-4" />
        <span className="hidden sm:inline">カテゴリ</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>カテゴリ管理</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              placeholder="例: 動画, 音楽, ソフトウェア"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            />
            <Button
              size="icon"
              onClick={handleAdd}
              disabled={!newName.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                カテゴリが登録されていません
              </p>
            ) : (
              categories.map((cat) => (
                <div key={cat} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm">{cat}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(cat)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            登録したカテゴリはサブスク追加・編集時に候補として表示されます
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
