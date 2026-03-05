'use client'

import { useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useEntregas } from '@/hooks/useEntregas'
import { AddEntregaInline } from '@/components/smp/AddEntregaInline'
import { FurnitureModal } from '@/components/smp/FurnitureModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { TargetIcon, Trash2Icon, PackageIcon, SettingsIcon, PlusIcon, XIcon } from 'lucide-react'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const P = {
  navy:     '#0D1B2A',
  dark:     '#1B263B',
  mid:      '#415A77',
  light:    '#778DA9',
  offwhite: '#E0E1DD',
}

const COLS = '130px 120px 1fr 70px 120px 70px 36px'

export default function EntregasPage() {
  const { profile } = useProfile()
  const {
    deliveries, goal, furnitureItems, variantStyles,
    loading, totalEntregado, totalDollars, pct,
    saveGoal, addDelivery, deleteDelivery, fetchAll,
  } = useEntregas()

  const [showAdd, setShowAdd]             = useState(false)
  const [showMeta, setShowMeta]           = useState(false)
  const [metaInput, setMetaInput]         = useState('')
  const [deleteId, setDeleteId]           = useState<string | null>(null)
  const [showFurniture, setShowFurniture] = useState(false)

  const canSetMeta         = profile?.role === 'admin' || profile?.role === 'supervisor'
  const canAdd             = profile?.role === 'admin' || profile?.role === 'asistente'
  const canDelete          = profile?.role === 'admin'
  const canManageFurniture = profile?.role === 'admin' || profile?.role === 'supervisor'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: P.light }}>
      Cargando...
    </div>
  )

  const now      = new Date()
  const restante = goal ? Math.max(0, goal.goal_amount - totalDollars) : 0
  const barColor = pct >= 100 ? '#22c55e' : pct >= 70 ? '#f59e0b' : P.mid

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto', fontFamily: 'inherit' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: P.navy, letterSpacing: -0.5 }}>
            Control de Entregas
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.light }}>
            {MONTH_NAMES[now.getMonth()]} {now.getFullYear()} · {deliveries.length} registro{deliveries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canManageFurniture && (
            <button onClick={() => setShowFurniture(true)} style={btnOutline}>
              <SettingsIcon size={13} style={{ marginRight: 6 }} /> Muebles
            </button>
          )}
          {canSetMeta && (
            <button
              onClick={() => { setMetaInput(goal?.goal_amount.toString() ?? ''); setShowMeta(true) }}
              style={btnOutline}
            >
              <TargetIcon size={13} style={{ marginRight: 6 }} />
              {goal ? 'Editar meta' : 'Establecer meta'}
            </button>
          )}
          {canAdd && (
            <button onClick={() => setShowAdd(p => !p)} style={{
              ...btnOutline,
              background: showAdd ? P.dark : P.navy,
              color: P.offwhite,
              borderColor: P.navy,
            }}>
              {showAdd
                ? <><XIcon size={13} style={{ marginRight: 6 }} />Cerrar</>
                : <><PlusIcon size={13} style={{ marginRight: 6 }} />Agregar</>
              }
            </button>
          )}
        </div>
      </div>

      {/* ── PROGRESS PANEL ── */}
      <div style={{
        background: P.navy, color: P.offwhite,
        padding: '20px 28px', marginBottom: 24,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          <Stat label="ENTREGADO"    value={`$${totalDollars.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} color="#22c55e" />
          <Stat label="META"         value={goal ? `$${goal.goal_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'} color={P.offwhite} />
          <Stat label="RESTANTE"     value={`$${restante.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} color={P.light} />
          <Stat label="UNIDADES"     value={totalEntregado.toString()} color={P.offwhite} />
          <Stat label="CUMPLIMIENTO" value={`${pct}%`} color={barColor} big />
        </div>
        <div style={{ height: 6, background: P.dark }}>
          <div style={{
            height: '100%', width: `${Math.min(pct, 100)}%`,
            background: barColor, transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* ── FORMULARIO INLINE ── */}
      {showAdd && canAdd && (
        <div style={{ border: `1px solid ${P.mid}`, marginBottom: 24, background: '#f8f9fa' }}>
          <div style={{
            background: P.dark, color: P.offwhite,
            padding: '10px 16px', fontSize: 12, fontWeight: 700, letterSpacing: 1,
          }}>
            NUEVA ENTREGA
          </div>
          <AddEntregaInline
            furnitureItems={furnitureItems}
            variantStyles={variantStyles}
            onSubmit={addDelivery}
          />
        </div>
      )}

      {/* ── TABLA ── */}
      <div style={{ border: `1px solid ${P.offwhite}` }}>

        {/* Header */}
        <div style={{
          background: P.dark, color: P.offwhite,
          display: 'grid', gridTemplateColumns: COLS,
          padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: 1, gap: 12,
        }}>
          <span>ITEM</span>
          <span>COLECCIÓN</span>
          <span>DESCRIPCIÓN / VARIANTES</span>
          <span style={{ textAlign: 'center' }}>CANT.</span>
          <span style={{ textAlign: 'right' }}>VALOR</span>
          <span style={{ textAlign: 'right' }}>HORA</span>
          <span />
        </div>

        {/* Rows */}
        {deliveries.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: P.light }}>
            <PackageIcon size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 14 }}>Sin entregas registradas</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.7 }}>
              {canAdd ? 'Usa "Agregar" para registrar la primera entrega.' : 'No hay entregas hoy.'}
            </p>
          </div>
        ) : (
          deliveries.map((d, i) => {
            const callers = d.delivery_variants?.filter(v => v.variant_type === 'caller') ?? []
            const legs    = d.delivery_variants?.filter(v => v.variant_type === 'leg')    ?? []
            const tops    = d.delivery_variants?.filter(v => v.variant_type === 'top')    ?? []
            const valor   = (d.unit_price ?? d.furniture_items?.price ?? 0) * d.qty

            return (
              <div key={d.id} style={{
                display: 'grid', gridTemplateColumns: COLS,
                padding: '10px 16px', gap: 12,
                background: i % 2 === 0 ? '#ffffff' : '#f8f9fa',
                borderTop: `1px solid ${P.offwhite}`,
                alignItems: 'start',
              }}>
                {/* Item code */}
                <span style={{
                  fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                  color: P.mid, background: '#eef2f7',
                  padding: '2px 6px', display: 'inline-block',
                }}>
                  {d.furniture_items?.item_code}
                </span>

                {/* Colección */}
                <span style={{ fontSize: 11, color: P.light, paddingTop: 2 }}>
                  {d.furniture_items?.coleccion}
                </span>

                {/* Descripción + variantes */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: P.navy, marginBottom: 2 }}>
                    {d.furniture_items?.description}
                  </div>
                  <div style={{ fontSize: 11, color: P.light, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {callers.length > 0 && <span>🔩 {callers.map(c => `${c.style_name} ×${c.qty}`).join(', ')}</span>}
                    {legs.length > 0    && <span>🦵 {legs.map(l => `${l.style_name} ×${l.qty}`).join(', ')}</span>}
                    {tops.length > 0    && <span>📋 {tops.map(t => `${t.style_name} ×${t.qty}`).join(', ')}</span>}
                    {d.comentario       && <span style={{ fontStyle: 'italic' }}>💬 {d.comentario}</span>}
                  </div>
                </div>

                {/* Cantidad */}
                <div style={{ textAlign: 'center', fontWeight: 700, color: P.navy, fontSize: 14 }}>
                  {d.qty}
                </div>

                {/* Valor */}
                <div style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a', fontSize: 13 }}>
                  ${valor.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>

                {/* Hora */}
                <div style={{ textAlign: 'right', fontSize: 11, color: P.light }}>
                  {new Date(d.created_at).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Delete */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {canDelete && (
                    <button
                      onClick={() => setDeleteId(d.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.offwhite, padding: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = P.offwhite)}
                    >
                      <Trash2Icon size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}

        {/* Footer total */}
        {deliveries.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: COLS,
            padding: '10px 16px', gap: 12,
            background: P.dark, color: P.offwhite,
            borderTop: `2px solid ${P.mid}`,
            fontSize: 12, fontWeight: 700,
          }}>
            <span />
            <span />
            <span>TOTAL</span>
            <span style={{ textAlign: 'center' }}>{totalEntregado}</span>
            <span style={{ textAlign: 'right', color: '#4ade80' }}>
              ${totalDollars.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span /><span />
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <FurnitureModal
        open={showFurniture}
        onClose={() => setShowFurniture(false)}
        items={furnitureItems}
        onRefresh={fetchAll}
      />

      <Dialog open={showMeta} onOpenChange={setShowMeta}>
        <DialogContent className="max-w-sm rounded-none">
          <DialogHeader>
            <DialogTitle>Meta del mes</DialogTitle>
            <DialogDescription>
              Define la meta en dólares para {MONTH_NAMES[now.getMonth()]}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Meta en dólares ($)</Label>
            <Input
              type="number" min={1} value={metaInput} autoFocus
              onChange={e => setMetaInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && metaInput && (saveGoal(parseFloat(metaInput)), setShowMeta(false))}
              placeholder="Ej: 50000"
              className="text-lg font-bold text-center rounded-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setShowMeta(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-none bg-[#1B263B] hover:bg-[#0D1B2A] text-[#E0E1DD] font-bold"
              disabled={!metaInput || parseFloat(metaInput) < 1}
              onClick={() => { saveGoal(parseFloat(metaInput)); setShowMeta(false) }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm rounded-none">
          <DialogHeader>
            <DialogTitle>¿Eliminar entrega?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="rounded-none"
              onClick={() => { deleteDelivery(deleteId!); setDeleteId(null) }}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── HELPERS ──
const btnOutline: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '7px 14px', fontSize: 12, fontWeight: 600,
  border: '1px solid #778DA9', background: 'white',
  color: '#1B263B', cursor: 'pointer', letterSpacing: 0.3,
}

function Stat({ label, value, color, big }: {
  label: string; value: string; color: string; big?: boolean
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#778DA9', letterSpacing: 1, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: big ? 28 : 22, fontWeight: 900, color, lineHeight: 1.1, marginTop: 2 }}>{value}</div>
    </div>
  )
}