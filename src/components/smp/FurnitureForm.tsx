'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FurnitureItem } from '@/lib/types'

const CATEGORIAS  = ['Mueble', 'Accesorio', 'Componente']
const COLECCIONES = [
  'Fall 2024',
  'Leora',
  'Continental Home Bedroom Collection',
  'Spring 2025',
  'Otra',
]

type FormData = {
  item_code:   string
  description: string
  price:       string
  categoria:   string
  coleccion:   string
  has_callers: boolean
  has_legs:    boolean
  has_top:     boolean
}

const EMPTY: FormData = {
  item_code: '', description: '', price: '',
  categoria: 'Mueble', coleccion: '',
  has_callers: false, has_legs: false, has_top: false,
}

interface Props {
  initial?: FurnitureItem | null
  onSubmit: (data: Omit<FurnitureItem, 'id' | 'active'>) => Promise<void>
  onCancel: () => void
  saving: boolean
}

export function FurnitureForm({ initial, onSubmit, onCancel, saving }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  useEffect(() => {
    if (initial) {
      setForm({
        item_code:   initial.item_code,
        description: initial.description,
        price:       initial.price?.toString() ?? '',
        categoria:   initial.categoria,
        coleccion:   initial.coleccion,
        has_callers: initial.has_callers,
        has_legs:    initial.has_legs,
        has_top:     initial.has_top,
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [initial])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(p => ({ ...p, [key]: value }))
    setErrors(p => ({ ...p, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!form.item_code.trim())   e.item_code   = 'Requerido'
    if (!form.description.trim()) e.description = 'Requerido'
    if (!form.coleccion.trim())   e.coleccion   = 'Requerido'
    if (form.price && isNaN(parseFloat(form.price))) e.price = 'Debe ser un número'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    await onSubmit({
      item_code:   form.item_code.trim(),
      description: form.description.trim(),
      price:       form.price ? parseFloat(form.price) : 0,
      categoria:   form.categoria,
      coleccion:   form.coleccion.trim(),
      has_callers: form.has_callers,
      has_legs:    form.has_legs,
      has_top:     form.has_top,
    })
  }

  const field = (label: string, key: keyof FormData, placeholder: string, type = 'text') => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key} type={type} placeholder={placeholder}
        value={form[key] as string}
        onChange={e => set(key, e.target.value as any)}
        className={errors[key] ? 'border-red-400' : ''}
      />
      {errors[key] && <p className="text-xs text-red-500">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Item + Descripción */}
      <div className="grid grid-cols-2 gap-4">
        {field('Item *', 'item_code', 'Ej: 155036')}
        {field('Precio', 'price', 'Ej: 519.00', 'number')}
      </div>

      {field('Descripción *', 'description', 'Ej: Howell Night Table')}

      {/* Categoría */}
      <div className="space-y-1.5">
        <Label>Categoría</Label>
        <Select value={form.categoria} onValueChange={v => set('categoria', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Colección */}
      <div className="space-y-1.5">
        <Label>Colección *</Label>
        <Select value={form.coleccion} onValueChange={v => set('coleccion', v)}>
          <SelectTrigger className={errors.coleccion ? 'border-red-400' : ''}>
            <SelectValue placeholder="Seleccionar colección..." />
          </SelectTrigger>
          <SelectContent>
            {COLECCIONES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.coleccion && <p className="text-xs text-red-500">{errors.coleccion}</p>}
      </div>

      {/* Toggles de características */}
      <div className="border border-slate-100 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Características del mueble
        </p>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="has_callers" className="text-sm cursor-pointer">🔩 Llamadores</Label>
            <p className="text-xs text-slate-400">El mueble requiere especificar estilo de llamadores</p>
          </div>
          <Switch
            id="has_callers"
            checked={form.has_callers}
            onCheckedChange={v => set('has_callers', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="has_legs" className="text-sm cursor-pointer">🦵 Patas</Label>
            <p className="text-xs text-slate-400">El mueble requiere especificar tipo de patas</p>
          </div>
          <Switch
            id="has_legs"
            checked={form.has_legs}
            onCheckedChange={v => set('has_legs', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="has_top" className="text-sm cursor-pointer">📋 Top Rústico / Liso</Label>
            <p className="text-xs text-slate-400">El mueble tiene variante de acabado en el top</p>
          </div>
          <Switch
            id="has_top"
            checked={form.has_top}
            onCheckedChange={v => set('has_top', v)}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear mueble'}
        </Button>
      </div>
    </div>
  )
}