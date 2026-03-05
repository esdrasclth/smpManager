'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { FurnitureItem, VariantStyle } from '@/lib/types'

const P = {
  navy: '#0D1B2A', dark: '#1B263B', mid: '#415A77',
  light: '#778DA9', offwhite: '#E0E1DD',
}

interface VariantQtys { [styleName: string]: number }

interface SubmitPayload {
  furniture_id: string
  qty: number
  unit_price: number
  comentario: string
  variants: { variant_type: string; style_name: string; qty: number }[]
}

interface Props {
  furnitureItems: FurnitureItem[]
  variantStyles: VariantStyle[]
  onSubmit: (payload: SubmitPayload) => Promise<void>
}

const inp: React.CSSProperties = {
  borderRadius: 0, border: `1px solid #778DA9`,
  fontSize: 13, padding: '6px 10px',
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const,
  width: '100%',
}

const inpDisabled: React.CSSProperties = {
  ...inp,
  background: '#f1f3f5',
  color: '#adb5bd',
  cursor: 'not-allowed',
}

const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#778DA9',
  letterSpacing: 1, display: 'block', marginBottom: 4,
}

export function AddEntregaInline({ furnitureItems, variantStyles, onSubmit }: Props) {
  const [search, setSearch] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const [dropIndex, setDropIndex] = useState(0)
  const [selected, setSelected] = useState<FurnitureItem | null>(null)
  const [qty, setQty] = useState<string>('1')
  const [callerQtys, setCallerQtys] = useState<VariantQtys>({})
  const [legQtys, setLegQtys] = useState<VariantQtys>({})
  const [topQtys, setTopQtys] = useState<VariantQtys>({})
  const [comentario, setComentario] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const searchRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)
  const comentRef = useRef<HTMLInputElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Refs para los variant inputs (en orden: callers, legs, tops)
  const variantRefs = useRef<(HTMLInputElement | null)[]>([])

  const callerStyles = variantStyles.filter(v => v.variant_type === 'caller')
  const legStyles = variantStyles.filter(v => v.variant_type === 'leg')
  const topStyles = variantStyles.filter(v => v.variant_type === 'top')

  // Todos los variant inputs en orden para navegación con Tab/Enter
  const activeVariants: { type: 'caller' | 'leg' | 'top'; name: string }[] = [
    ...(selected?.has_callers ? callerStyles.map(s => ({ type: 'caller' as const, name: s.name })) : []),
    ...(selected?.has_legs ? legStyles.map(s => ({ type: 'leg' as const, name: s.name })) : []),
    ...(selected?.has_top ? topStyles.map(s => ({ type: 'top' as const, name: s.name })) : []),
  ]

  const results = search.length >= 1
    ? furnitureItems.filter(f =>
      f.item_code.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 8)
    : []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus inicial
  useEffect(() => { searchRef.current?.focus() }, [])

  function selectFurniture(f: FurnitureItem) {
    setSelected(f)
    setSearch(`${f.item_code} — ${f.description}`)
    setShowDrop(false)
    setCallerQtys({})
    setLegQtys({})
    setTopQtys({})
    setErrors({})
    setTimeout(() => qtyRef.current?.focus(), 50)
  }

  function getVariantQty(type: 'caller' | 'leg' | 'top', name: string): number {
    if (type === 'caller') return callerQtys[name] ?? 0
    if (type === 'leg') return legQtys[name] ?? 0
    return topQtys[name] ?? 0
  }

  function setVariantQty(type: 'caller' | 'leg' | 'top', name: string, val: number) {
    if (type === 'caller') setCallerQtys(p => ({ ...p, [name]: val }))
    else if (type === 'leg') setLegQtys(p => ({ ...p, [name]: val }))
    else setTopQtys(p => ({ ...p, [name]: val }))
  }

  // Validación de variantes: suma no puede superar qty
  function validateVariants(): boolean {
    const q = parseInt(qty) || 0
    const newErrors: Record<string, string> = {}

    if (selected?.has_callers) {
      const sum = callerStyles.reduce((s, st) => s + (callerQtys[st.name] ?? 0), 0)
      if (sum > q) newErrors['callers'] = `Suma (${sum}) supera la cantidad (${q})`
    }
    if (selected?.has_legs) {
      const sum = legStyles.reduce((s, st) => s + (legQtys[st.name] ?? 0), 0)
      if (sum > q) newErrors['legs'] = `Suma (${sum}) supera la cantidad (${q})`
    }
    if (selected?.has_top) {
      const sum = topStyles.reduce((s, st) => s + (topQtys[st.name] ?? 0), 0)
      if (sum > q) newErrors['tops'] = `Suma (${sum}) supera la cantidad (${q})`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function reset() {
    setSearch(''); setSelected(null); setQty('1')
    setCallerQtys({}); setLegQtys({}); setTopQtys({})
    setComentario(''); setErrors({})
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  async function handleSubmit() {
    if (!selected || saving) return
    if (!validateVariants()) return

    setSaving(true)
    const variants: SubmitPayload['variants'] = []

    callerStyles.forEach(s => {
      const q = callerQtys[s.name] ?? 0
      if (q > 0) variants.push({ variant_type: 'caller', style_name: s.name, qty: q })
    })
    legStyles.forEach(s => {
      const q = legQtys[s.name] ?? 0
      if (q > 0) variants.push({ variant_type: 'leg', style_name: s.name, qty: q })
    })
    topStyles.forEach(s => {
      const q = topQtys[s.name] ?? 0
      if (q > 0) variants.push({ variant_type: 'top', style_name: s.name, qty: q })
    })

    await onSubmit({
      furniture_id: selected.id,
      qty: parseInt(qty) || 1,
      unit_price: selected.price,
      comentario,
      variants,
    })

    setSaving(false)
    setSuccess(true)
    reset()
    setTimeout(() => setSuccess(false), 2000)
  }

  // Navegación con Enter: search → qty → variants (en orden) → comentario → submit
  function handleQtyKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (activeVariants.length > 0) {
        variantRefs.current[0]?.focus()
      } else {
        comentRef.current?.focus()
      }
    }
  }

  function handleVariantKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (idx < activeVariants.length - 1) {
        variantRefs.current[idx + 1]?.focus()
      } else {
        comentRef.current?.focus()
      }
    }
  }

  function handleComentKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitRef.current?.focus()
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (!showDrop || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setDropIndex(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setDropIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); selectFurniture(results[dropIndex]) }
    if (e.key === 'Escape') { setShowDrop(false) }
  }

  const qtyNum = parseInt(qty) || 0

  // Totales para mostrar remaining
  const callerSum = callerStyles.reduce((s, st) => s + (callerQtys[st.name] ?? 0), 0)
  const legSum = legStyles.reduce((s, st) => s + (legQtys[st.name] ?? 0), 0)
  const topSum = topStyles.reduce((s, st) => s + (topQtys[st.name] ?? 0), 0)

  return (
    <div style={{ padding: 20 }}>

      {/* ROW 1: Buscador + Cantidad */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 16, marginBottom: 16 }}>

        {/* Buscador */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <label style={lbl}>ITEM / DESCRIPCIÓN *</label>
          <input
            ref={searchRef}
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setShowDrop(true)
              setSelected(null)
              setDropIndex(0)
            }}
            onFocus={() => search.length >= 1 && setShowDrop(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Escribe item o nombre..."
            style={inp}
            autoComplete="off"
          />
          {showDrop && results.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: 'white', border: `1px solid ${P.mid}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              maxHeight: 280, overflowY: 'auto',
            }}>
              {results.map((f, i) => (
                <div key={f.id}
                  onClick={() => selectFurniture(f)}
                  style={{
                    padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                    borderBottom: `1px solid ${P.offwhite}`,
                    display: 'grid', gridTemplateColumns: '110px 1fr 90px 80px',
                    gap: 10, alignItems: 'center',
                    background: i === dropIndex ? P.offwhite : 'white',
                  }}
                  onMouseEnter={() => setDropIndex(i)}
                >
                  <span style={{ fontFamily: 'monospace', color: P.mid, fontWeight: 700, fontSize: 12 }}>
                    {f.item_code}
                  </span>
                  <span style={{ color: P.dark, fontSize: 12 }}>{f.description}</span>
                  <span style={{ color: P.light, fontSize: 11 }}>{f.coleccion}</span>
                  <span style={{ color: '#16a34a', fontSize: 11, textAlign: 'right' }}>
                    ${f.price?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cantidad */}
        <div>
          <label style={lbl}>CANTIDAD *</label>
          <input
            ref={qtyRef}
            type="number" min={1}
            value={qty}
            onChange={e => setQty(e.target.value)}
            onKeyDown={handleQtyKeyDown}
            style={inp}
            onFocus={e => e.target.select()}
          />
        </div>
      </div>

      {/* Info del mueble seleccionado */}
      {selected && (
        <div style={{
          background: '#eef2f7', padding: '8px 14px', marginBottom: 16,
          fontSize: 12, color: P.dark, display: 'flex', gap: 24, flexWrap: 'wrap',
          borderLeft: `3px solid ${P.mid}`,
        }}>
          <span style={{ color: P.light }}>{selected.coleccion}</span>
          <span>Precio: <strong>${selected.price?.toLocaleString()}</strong></span>
          <span>Total: <strong style={{ color: '#16a34a' }}>
            ${(selected.price * qtyNum).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </strong></span>
        </div>
      )}

      {selected && (selected.has_callers || selected.has_legs || selected.has_top) && (
        <div style={{ display: 'flex', gap: 32, marginBottom: 16, flexWrap: 'wrap' }}>

          {selected.has_callers && (
            <VariantGroup
              label="🔩 LLAMADORES"
              labelColor="#7c3aed"
              styles={callerStyles.map(s => s.name)}
              qtys={callerQtys}
              total={qtyNum}
              sum={callerSum}
              enabled={true}
              error={errors['callers']}
              refs={variantRefs}
              startIdx={0}
              onKeyDown={handleVariantKeyDown}
              onChange={(name, val) => setVariantQty('caller', name, val)}
            />
          )}

          {selected.has_legs && (
            <VariantGroup
              label="🦵 PATAS"
              labelColor="#1d4ed8"
              styles={legStyles.map(s => s.name)}
              qtys={legQtys}
              total={qtyNum}
              sum={legSum}
              enabled={true}
              error={errors['legs']}
              refs={variantRefs}
              startIdx={selected.has_callers ? callerStyles.length : 0}
              onKeyDown={handleVariantKeyDown}
              onChange={(name, val) => setVariantQty('leg', name, val)}
            />
          )}

          {selected.has_top && (
            <VariantGroup
              label="📋 TOP"
              labelColor="#b45309"
              styles={topStyles.map(s => s.name)}
              qtys={topQtys}
              total={qtyNum}
              sum={topSum}
              enabled={true}
              error={errors['tops']}
              refs={variantRefs}
              startIdx={
                (selected.has_callers ? callerStyles.length : 0) +
                (selected.has_legs ? legStyles.length : 0)
              }
              onKeyDown={handleVariantKeyDown}
              onChange={(name, val) => setVariantQty('top', name, val)}
            />
          )}
        </div>
      )}

      {/* ROW 3: Comentario + Submit */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
        <div>
          <label style={lbl}>COMENTARIO (opcional)</label>
          <input
            ref={comentRef}
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            onKeyDown={handleComentKeyDown}
            placeholder="Observaciones..."
            style={inp}
          />
        </div>
        <button
          ref={submitRef}
          onClick={handleSubmit}
          disabled={!selected || saving}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{
            padding: '8px 28px', fontWeight: 800, fontSize: 13,
            background: success ? '#16a34a' : (!selected || saving) ? P.light : P.navy,
            color: P.offwhite, border: 'none',
            cursor: !selected || saving ? 'default' : 'pointer',
            letterSpacing: 0.5, transition: 'background 0.2s', whiteSpace: 'nowrap' as const,
            height: 36,
          }}>
          {saving ? 'Guardando...' : success ? '✓ Agregado' : 'AGREGAR →'}
        </button>
      </div>
    </div>
  )
}

// ── VariantGroup ─────────────────────────────────────────────────────────────
interface VariantGroupProps {
  label: string
  labelColor: string
  styles: string[]
  qtys: VariantQtys
  total: number
  sum: number
  enabled: boolean
  error?: string
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  startIdx: number
  onKeyDown: (e: React.KeyboardEvent, idx: number) => void
  onChange: (name: string, val: number) => void
}

function VariantGroup({
  label, labelColor, styles, qtys, total, sum,
  enabled, error, refs, startIdx, onKeyDown, onChange,
}: VariantGroupProps) {
  const remaining = total - sum

  return (
    <div style={{ minWidth: 160 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: enabled ? labelColor : '#adb5bd',
        letterSpacing: 1, marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {label}
        {enabled && total > 0 && (
          <span style={{
            fontSize: 10, color: remaining < 0 ? '#ef4444' : remaining === 0 ? '#16a34a' : '#778DA9',
            fontWeight: 600,
          }}>
            {sum}/{total}
          </span>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${styles.length}, 1fr)`,
        gap: 6,
      }}>
        {styles.map((name, i) => {
          const globalIdx = startIdx + i
          const isOver = enabled && sum > total

          return (
            <div key={name}>
              <div style={{
                fontSize: 10, fontWeight: 700, textAlign: 'center',
                color: enabled ? '#415A77' : '#adb5bd', marginBottom: 2, letterSpacing: 0.5,
              }}>
                {name}
              </div>
              <input
                ref={el => { refs.current[globalIdx] = el }}
                type="number" min={0}
                value={enabled ? (qtys[name] ?? 0) : 0}
                disabled={!enabled}
                onChange={e => onChange(name, Math.max(0, parseInt(e.target.value) || 0))}
                onKeyDown={e => onKeyDown(e, globalIdx)}
                onFocus={e => enabled && e.target.select()}
                style={{
                  borderRadius: 0,
                  border: `1px solid ${isOver ? '#ef4444' : '#778DA9'}`,
                  fontSize: 13, padding: '6px 4px',
                  fontFamily: 'inherit', outline: 'none',
                  width: '100%', textAlign: 'center',
                  background: !enabled ? '#f1f3f5' : isOver ? '#fff5f5' : 'white',
                  color: !enabled ? '#adb5bd' : P.dark,
                  cursor: !enabled ? 'not-allowed' : 'text',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>{error}</div>
      )}
    </div>
  )
}