'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FurnitureForm } from './FurnitureForm'
import { useFurniture } from '@/hooks/useFurniture'
import { PlusIcon, PencilIcon, PowerIcon, SearchIcon, ArrowLeftIcon } from 'lucide-react'
import type { FurnitureItem } from '@/lib/types'

type View = 'list' | 'create' | 'edit'

interface Props {
  open: boolean
  onClose: () => void
  items: FurnitureItem[]
  onRefresh: () => void
}

export function FurnitureModal({ open, onClose, items, onRefresh }: Props) {
  const { saving, createItem, updateItem, toggleActive } = useFurniture()
  const [view, setView] = useState<View>('list')
  const [editing, setEditing] = useState<FurnitureItem | null>(null)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  function handleClose() {
    setView('list')
    setEditing(null)
    setSearch('')
    onClose()
  }

  async function handleCreate(data: Omit<FurnitureItem, 'id' | 'active'>) {
    const error = await createItem(data)
    if (!error) { onRefresh(); setView('list') }
  }

  async function handleUpdate(data: Omit<FurnitureItem, 'id' | 'active'>) {
    if (!editing) return
    console.log('editing id:', editing.id)
    console.log('data:', data)
    const error = await updateItem(editing.id, data)
    console.log('error resultado:', error)
    if (!error) { onRefresh(); setView('list'); setEditing(null) }
  }

  async function handleToggle(item: FurnitureItem) {
    await toggleActive(item.id, !item.active)
    onRefresh()
  }

  const filtered = items
    .filter(i => showInactive ? true : i.active)
    .filter(i =>
      i.item_code.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase()) ||
      i.coleccion.toLowerCase().includes(search.toLowerCase())
    )

  const title = view === 'create' ? 'Nuevo mueble'
    : view === 'edit' ? 'Editar mueble'
      : 'Gestión de muebles'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view !== 'list' && (
              <button onClick={() => { setView('list'); setEditing(null) }}
                className="text-slate-400 hover:text-slate-700 transition-colors">
                <ArrowLeftIcon size={16} />
              </button>
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Vista: Lista */}
        {view === 'list' && (
          <div className="space-y-4 pt-2">
            {/* Barra de búsqueda + acciones */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar item, descripción o colección..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowInactive(p => !p)}
                className={showInactive ? 'border-orange-300 text-orange-600' : ''}
              >
                {showInactive ? 'Ver activos' : 'Ver todos'}
              </Button>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
                onClick={() => setView('create')}
              >
                <PlusIcon size={14} className="mr-1.5" />
                Nuevo
              </Button>
            </div>

            {/* Tabla */}
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No se encontraron muebles.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtered.map(item => (
                    <div key={item.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${!item.active ? 'opacity-50' : ''}`}>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-mono text-xs bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded font-bold">
                            {item.item_code}
                          </span>
                          <span className="text-sm font-medium text-slate-700 truncate">
                            {item.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-400">{item.coleccion}</span>
                          {item.price > 0 && (
                            <span className="text-xs text-slate-400">${item.price.toLocaleString()}</span>
                          )}
                          {item.has_callers && <Badge variant="outline" className="text-purple-600 border-purple-200 text-xs py-0">🔩</Badge>}
                          {item.has_legs && <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs py-0">🦵</Badge>}
                          {item.has_top && <Badge variant="outline" className="text-amber-600 border-amber-200 text-xs py-0">📋</Badge>}
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setEditing(item); setView('edit') }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="Editar"
                        >
                          <PencilIcon size={13} />
                        </button>
                        <button
                          onClick={() => handleToggle(item)}
                          className={`p-1.5 rounded transition-colors ${item.active
                            ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                            : 'text-green-500 hover:text-green-700 hover:bg-green-50'}`}
                          title={item.active ? 'Desactivar' : 'Activar'}
                        >
                          <PowerIcon size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 text-right">
              {filtered.length} mueble{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Vista: Crear / Editar */}
        {(view === 'create' || view === 'edit') && (
          <div className="pt-2">
            <FurnitureForm
              initial={view === 'edit' ? editing : null}
              onSubmit={view === 'create' ? handleCreate : handleUpdate}
              onCancel={() => { setView('list'); setEditing(null) }}
              saving={saving}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}