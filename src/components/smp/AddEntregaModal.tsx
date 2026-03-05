'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronsUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FurnitureItem, VariantStyle } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  furnitureItems: FurnitureItem[]
  variantStyles: VariantStyle[]
  onSubmit: (payload: {
    furniture_id: string
    qty: number
    comentario: string
    variants: { variant_type: string; style_name: string; qty: number }[]
  }) => Promise<void>
}

export function AddEntregaModal({ open, onClose, furnitureItems, variantStyles, onSubmit }: Props) {
  const [comboOpen, setComboOpen]   = useState(false)
  const [selected, setSelected]     = useState<FurnitureItem | null>(null)
  const [qty, setQty]               = useState(1)
  const [callerQtys, setCallerQtys] = useState<Record<string, number>>({})
  const [legQtys, setLegQtys]       = useState<Record<string, number>>({})
  const [topRustico, setTopRustico] = useState(0)
  const [topLiso, setTopLiso]       = useState(0)
  const [comentario, setComentario] = useState('')
  const [saving, setSaving]         = useState(false)

  const callerStyles = variantStyles.filter(v => v.variant_type === 'caller')
  const legStyles    = variantStyles.filter(v => v.variant_type === 'leg')

  useEffect(() => {
    if (!open) {
      setSelected(null); setQty(1); setCallerQtys({}); setLegQtys({})
      setTopRustico(0); setTopLiso(0); setComentario('')
    }
  }, [open])

  async function handleSubmit() {
    if (!selected) return
    setSaving(true)

    const variants: { variant_type: string; style_name: string; qty: number }[] = []

    if (selected.has_callers) {
      callerStyles.forEach(s => {
        const q = callerQtys[s.name] || 0
        if (q > 0) variants.push({ variant_type: 'caller', style_name: s.name, qty: q })
      })
    }
    if (selected.has_legs) {
      legStyles.forEach(s => {
        const q = legQtys[s.name] || 0
        if (q > 0) variants.push({ variant_type: 'leg', style_name: s.name, qty: q })
      })
    }
    if (selected.has_top) {
      if (topRustico > 0) variants.push({ variant_type: 'top', style_name: 'Rústico', qty: topRustico })
      if (topLiso > 0)    variants.push({ variant_type: 'top', style_name: 'Liso',    qty: topLiso })
    }

    await onSubmit({ furniture_id: selected.id, qty, comentario, variants })
    setSaving(false)
    onClose()
  }

  const inputCls = "h-8 text-sm"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Entrega</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Buscador de mueble */}
          <div className="space-y-1.5">
            <Label>Item del mueble</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox"
                  className="w-full justify-between font-normal text-sm h-9">
                  {selected
                    ? <span><span className="font-mono text-orange-600">{selected.item_code}</span> — {selected.description}</span>
                    : <span className="text-slate-400">Buscar item o descripción...</span>
                  }
                  <ChevronsUpDown size={14} className="ml-2 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar..." />
                  <CommandList>
                    <CommandEmpty>No se encontró ningún mueble.</CommandEmpty>
                    <CommandGroup>
                      {furnitureItems.map(f => (
                        <CommandItem key={f.id} value={`${f.item_code} ${f.description}`}
                          onSelect={() => { setSelected(f); setComboOpen(false) }}>
                          <Check size={14} className={cn("mr-2", selected?.id === f.id ? "opacity-100" : "opacity-0")} />
                          <span className="font-mono text-orange-600 text-xs mr-2">{f.item_code}</span>
                          <span className="text-sm">{f.description}</span>
                          <span className="ml-auto text-xs text-slate-400">{f.coleccion}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selected && (
            <>
              {/* Badges de características */}
              <div className="flex gap-2 flex-wrap">
                {selected.has_legs    && <Badge variant="outline" className="text-blue-600 border-blue-200">🦵 Patas</Badge>}
                {selected.has_callers && <Badge variant="outline" className="text-purple-600 border-purple-200">🔩 Llamadores</Badge>}
                {selected.has_top     && <Badge variant="outline" className="text-amber-600 border-amber-200">📋 Top</Badge>}
              </div>

              {/* Cantidad */}
              <div className="space-y-1.5">
                <Label>Cantidad de muebles</Label>
                <Input type="number" min={1} value={qty} className={cn(inputCls, "w-28")}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>

              {/* Llamadores */}
              {selected.has_callers && (
                <div className="space-y-2">
                  <Label className="text-purple-700">Llamadores — cantidad por estilo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {callerStyles.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 flex-1 truncate">{s.name}</span>
                        <Input type="number" min={0} value={callerQtys[s.name] || 0}
                          className={cn(inputCls, "w-16 text-center")}
                          onChange={e => setCallerQtys(p => ({ ...p, [s.name]: Math.max(0, parseInt(e.target.value) || 0) }))} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patas */}
              {selected.has_legs && (
                <div className="space-y-2">
                  <Label className="text-blue-700">Patas — cantidad por tipo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {legStyles.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 flex-1 truncate">{s.name}</span>
                        <Input type="number" min={0} value={legQtys[s.name] || 0}
                          className={cn(inputCls, "w-16 text-center")}
                          onChange={e => setLegQtys(p => ({ ...p, [s.name]: Math.max(0, parseInt(e.target.value) || 0) }))} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top */}
              {selected.has_top && (
                <div className="space-y-2">
                  <Label className="text-amber-700">Top — Rústico / Liso</Label>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Rústico</span>
                      <Input type="number" min={0} value={topRustico}
                        className={cn(inputCls, "w-16 text-center")}
                        onChange={e => setTopRustico(Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Liso</span>
                      <Input type="number" min={0} value={topLiso}
                        className={cn(inputCls, "w-16 text-center")}
                        onChange={e => setTopLiso(Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                  </div>
                </div>
              )}

              {/* Comentario */}
              <div className="space-y-1.5">
                <Label>Comentario <span className="text-slate-400 font-normal">(opcional)</span></Label>
                <Input value={comentario} onChange={e => setComentario(e.target.value)}
                  placeholder="Observaciones, incidencias..." className="text-sm" />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold"
              disabled={!selected || saving} onClick={handleSubmit}>
              {saving ? 'Guardando...' : 'Agregar Entrega'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}