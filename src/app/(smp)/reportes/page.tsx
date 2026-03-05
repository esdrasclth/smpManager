'use client'

import { useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { createClient } from '@/lib/supabase/client'
import { SettingsIcon, FileTextIcon, PackageIcon, WrenchIcon } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const P = {
    navy: '#0D1B2A',
    dark: '#1B263B',
    mid: '#415A77',
    light: '#778DA9',
    offwhite: '#E0E1DD',
}

type ReportRow = {
    part_code: string
    part_name: string
    categoria: string
    um: string
    total_qty: number
}

type DeliveryDetail = {
    item_code: string
    description: string
    qty: number
    parts: ReportRow[]
}

type ReportData = {
    trim: ReportRow[]
    carton: ReportRow[]
    glass: ReportRow[]
    details: DeliveryDetail[]
    callers: CallerSummary[]
    dateFrom: string
    dateTo: string
    totalMuebles: number
}

type CallerSummary = {
    item_code: string
    description: string
    qty_muebles: number
    HB: number
    HK: number
    HR: number
    HH: number
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function ReportesPage() {
    const { profile } = useProfile()
    const supabase = createClient()

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const fmt = (d: Date) => d.toISOString().split('T')[0]

    const [dateFrom, setDateFrom] = useState(fmt(yesterday))
    const [dateTo, setDateTo] = useState(fmt(yesterday))
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState<ReportData | null>(null)
    const [activeTab, setActiveTab] = useState<'trim' | 'carton' | 'glass'>('trim')

    async function generateReport() {
        setLoading(true)
        setReport(null)

        // Rango: desde inicio del día from hasta fin del día to
        const from = new Date(`${dateFrom}T00:00:00`).toISOString()
        const to = new Date(`${dateTo}T23:59:59`).toISOString()

        // Obtener entregas del rango
        const { data: deliveries } = await supabase
            .from('deliveries')
            .select('qty, furniture_items(id, item_code, description, has_callers), delivery_variants(*)')
            .gte('created_at', from)
            .lte('created_at', to)

        if (!deliveries || deliveries.length === 0) {
            setReport({ trim: [], carton: [], glass: [], details: [], callers: [], dateFrom, dateTo, totalMuebles: 0 })
            setLoading(false)
            return
        }


        // Agrupar entregas por furniture_id sumando qty
        const furnitureMap = new Map<string, { item_code: string; description: string; qty: number; id: string }>()
        for (const d of deliveries) {
            const fi = d.furniture_items as any
            if (!fi) continue
            const existing = furnitureMap.get(fi.id)
            if (existing) {
                existing.qty += d.qty
            } else {
                furnitureMap.set(fi.id, { id: fi.id, item_code: fi.item_code, description: fi.description, qty: d.qty })
            }
        }

        const furnitureIds = Array.from(furnitureMap.keys())
        const totalMuebles = Array.from(furnitureMap.values()).reduce((s, f) => s + f.qty, 0)

        // Resumen de llamadores por mueble 
        const callerMap = new Map<string, CallerSummary>()

        for (const d of deliveries) {
            const fi = d.furniture_items as any
            if (!fi?.has_callers) continue

            const existing = callerMap.get(fi.id) ?? {
                item_code: fi.item_code,
                description: fi.description,
                qty_muebles: 0,
                HB: 0, HK: 0, HR: 0, HH: 0,
            }

            existing.qty_muebles += d.qty

            const variants = (d.delivery_variants as any[]) ?? []
            for (const v of variants) {
                if (v.variant_type !== 'caller') continue
                const style = v.style_name as 'HB' | 'HK' | 'HR' | 'HH'
                if (style in existing) existing[style] += v.qty
            }

            callerMap.set(fi.id, existing)
        }

        // Obtener BOM de esos muebles
        const { data: bom } = await supabase
            .from('bom_items')
            .select('*')
            .in('furniture_id', furnitureIds)

        if (!bom || bom.length === 0) {
            setReport({ trim: [], carton: [], glass: [], details: [], callers: [], dateFrom, dateTo, totalMuebles })
            setLoading(false)
            return
        }
        // Consolidar por part_code × qty de muebles entregados
        const trimMap = new Map<string, ReportRow>()
        const cartonMap = new Map<string, ReportRow>()
        const glassMap = new Map<string, ReportRow>()

        // Detalle por mueble
        const detailMap = new Map<string, DeliveryDetail>()

        for (const item of furnitureMap.values()) {
            detailMap.set(item.id, {
                item_code: item.item_code,
                description: item.description,
                qty: item.qty,
                parts: [],
            })
        }

        for (const b of bom) {
            const furniture = furnitureMap.get(b.furniture_id)
            if (!furniture) continue

            const totalQty = b.qty_per_unit * furniture.qty
            const row: ReportRow = {
                part_code: b.part_code,
                part_name: b.part_name,
                categoria: b.categoria,
                um: b.um,
                total_qty: totalQty,
            }

            // Agregar al detalle del mueble
            const detail = detailMap.get(b.furniture_id)
            if (detail) detail.parts.push(row)

            // Consolidar por categoría
            const target = b.categoria === 'TRIM'
                ? trimMap
                : b.categoria === 'CARTON'
                    ? cartonMap
                    : ['SKID', 'VIDRIOS', 'CONTRAPESO'].includes(b.categoria)
                        ? glassMap
                        : null

            if (!target) continue

            const existing = target.get(b.part_code)
            if (existing) {
                existing.total_qty += totalQty
            } else {
                target.set(b.part_code, { ...row })
            }
        }

        const sortByCode = (a: ReportRow, b: ReportRow) => a.part_code.localeCompare(b.part_code)

        setReport({
            trim: Array.from(trimMap.values()).sort(sortByCode),
            carton: Array.from(cartonMap.values()).sort(sortByCode),
            glass: Array.from(glassMap.values()).sort(sortByCode),
            details: Array.from(detailMap.values()).sort((a, b) => a.item_code.localeCompare(b.item_code)),
            callers: Array.from(callerMap.values()).sort((a, b) => a.item_code.localeCompare(b.item_code)),
            dateFrom,
            dateTo,
            totalMuebles,
        })

        setLoading(false)
    }

    function printReport(tab: 'trim' | 'carton' | 'glass') {
        if (!report) return

        const tabLabel = {
            trim: 'TRIM',
            carton: 'CARTÓN',
            glass: 'VIDRIOS / SKID / CONTRAPESO',
        }

        const rows = tabData![tab]
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

        // Header
        doc.setFillColor(13, 27, 42) // P.navy
        doc.rect(0, 0, 216, 28, 'F')
        doc.setTextColor(224, 225, 221) // P.offwhite
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(`HOJA DE PREPARACIÓN — ${tabLabel[tab]}`, 14, 12)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(`Período: ${report.dateFrom === report.dateTo ? report.dateFrom : `${report.dateFrom} → ${report.dateTo}`}`, 14, 19)
        doc.text(`Total muebles: ${report.totalMuebles}`, 14, 24)
        doc.text(`Generado: ${new Date().toLocaleString('es-HN')}`, 120, 19)

        // Muebles incluidos
        doc.setTextColor(65, 90, 119)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('MUEBLES INCLUIDOS:', 14, 34)
        doc.setFont('helvetica', 'normal')
        const mueblesText = report.details
            .map(d => `${d.item_code} ×${d.qty}`)
            .join('   ')
        doc.text(mueblesText, 14, 39, { maxWidth: 188 })

        // Tabla principal
        autoTable(doc, {
            startY: 46,
            head: [['CÓDIGO', 'DESCRIPCIÓN', 'CATEGORÍA', 'TOTAL', 'UM', 'CANT. ENTREGADA']],
            body: rows.map(r => [
                r.part_code,
                r.part_name,
                r.categoria,
                r.total_qty % 1 === 0 ? r.total_qty.toString() : r.total_qty.toFixed(2),
                r.um,
                '',  // columna vacía para llenar a mano
            ]),
            foot: [[
                '', `${rows.length} componentes`, '',
                rows.reduce((s, r) => s + r.total_qty, 0).toFixed(0),
                '', ''
            ]],
            styles: {
                fontSize: 8,
                cellPadding: 3,
                lineColor: [224, 225, 221],
                lineWidth: 0.3,
            },
            headStyles: {
                fillColor: [65, 90, 119],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
            },
            footStyles: {
                fillColor: [27, 38, 59],
                textColor: [224, 225, 221],
                fontStyle: 'bold',
            },
            columnStyles: {
                0: { cellWidth: 28, font: 'courier' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 22, halign: 'center' },
                3: { cellWidth: 16, halign: 'right' },
                4: { cellWidth: 12, halign: 'center' },
                5: { cellWidth: 30, halign: 'center', fillColor: [248, 249, 250] },
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250],
            },
            didDrawCell: (data) => {
                // Línea en la columna CANT. ENTREGADA para escribir a mano
                if (data.section === 'body' && data.column.index === 5) {
                    const doc = data.doc
                    doc.setDrawColor(119, 141, 169)
                    doc.setLineWidth(0.4)
                    const x1 = data.cell.x + 4
                    const x2 = data.cell.x + data.cell.width - 4
                    const y = data.cell.y + data.cell.height - 2
                    doc.line(x1, y, x2, y)
                }
            },
        })

        if (tab === 'trim' && report.callers.length > 0) {
            const finalY = (doc as any).lastAutoTable.finalY + 10

            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(124, 58, 237)
            doc.text('DESGLOSE DE LLAMADORES POR MUEBLE', 14, finalY)

            autoTable(doc, {
                startY: finalY + 4,
                head: [['ITEM', 'DESCRIPCIÓN', 'MUEBLES', 'HB', 'HK', 'HR', 'HH']],
                body: report.callers.map(c => [
                    c.item_code,
                    c.description,
                    c.qty_muebles.toString(),
                    c.HB || '—',
                    c.HK || '—',
                    c.HR || '—',
                    c.HH || '—',
                ]),
                foot: [[
                    '', 'TOTAL',
                    report.callers.reduce((s, c) => s + c.qty_muebles, 0).toString(),
                    report.callers.reduce((s, c) => s + c.HB, 0) || '—',
                    report.callers.reduce((s, c) => s + c.HK, 0) || '—',
                    report.callers.reduce((s, c) => s + c.HR, 0) || '—',
                    report.callers.reduce((s, c) => s + c.HH, 0) || '—',
                ]],
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
                footStyles: { fillColor: [27, 38, 59], textColor: [224, 225, 221], fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 22, font: 'courier' },
                    2: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { halign: 'center' },
                    6: { halign: 'center' },
                },
            })
        }

        const filename = `${tab}_${report.dateFrom}_${report.dateTo}.pdf`
        doc.save(filename)
    }

    const tabLabel = { trim: 'TRIM', carton: 'CARTÓN', glass: 'VIDRIOS / SKID / CONTRAPESO' }
    const tabIcon = { trim: <WrenchIcon size={14} />, carton: <PackageIcon size={14} />, glass: <FileTextIcon size={14} /> }
    const tabData = report ? { trim: report.trim, carton: report.carton, glass: report.glass } : null

    return (
        <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: 'inherit' }}>

            {/* HEADER */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: P.navy, letterSpacing: -0.5 }}>
                    Reportes de Preparación
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: P.light }}>
                    Genera las hojas de TRIM, Cartón y Vidrios a partir de las entregas
                </p>
            </div>

            {/* SELECTOR DE FECHA */}
            <div style={{
                background: P.navy, padding: '20px 28px', marginBottom: 24,
                display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap',
            }}>
                <div>
                    <div style={{ fontSize: 10, color: P.light, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
                        DESDE
                    </div>
                    <input
                        type="date" value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        style={{
                            padding: '7px 12px', fontSize: 13, fontFamily: 'inherit',
                            border: `1px solid ${P.mid}`, borderRadius: 0, outline: 'none',
                            background: P.dark, color: P.offwhite,
                        }}
                    />
                </div>
                <div>
                    <div style={{ fontSize: 10, color: P.light, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
                        HASTA
                    </div>
                    <input
                        type="date" value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        style={{
                            padding: '7px 12px', fontSize: 13, fontFamily: 'inherit',
                            border: `1px solid ${P.mid}`, borderRadius: 0, outline: 'none',
                            background: P.dark, color: P.offwhite,
                        }}
                    />
                </div>
                <button
                    onClick={generateReport}
                    disabled={loading}
                    style={{
                        padding: '8px 28px', fontWeight: 800, fontSize: 13,
                        background: loading ? P.mid : P.offwhite,
                        color: P.navy, border: 'none', cursor: loading ? 'default' : 'pointer',
                        letterSpacing: 0.5,
                    }}
                >
                    {loading ? 'Generando...' : 'GENERAR REPORTE'}
                </button>
            </div>

            {/* RESULTADO */}
            {report && (
                <>
                    {/* Resumen */}
                    <div style={{
                        display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap',
                    }}>
                        <StatBox label="PERÍODO" value={dateFrom === dateTo ? dateFrom : `${dateFrom} → ${dateTo}`} />
                        <StatBox label="TOTAL MUEBLES" value={report.totalMuebles.toString()} />
                        <StatBox label="ITEMS TRIM" value={report.trim.length.toString()} />
                        <StatBox label="ITEMS CARTÓN" value={report.carton.length.toString()} />
                        <StatBox label="ITEMS VIDRIOS/SKID" value={report.glass.length.toString()} />
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: `2px solid ${P.offwhite}` }}>
                        {(['trim', 'carton', 'glass'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                padding: '10px 20px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
                                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                background: activeTab === tab ? P.dark : 'white',
                                color: activeTab === tab ? P.offwhite : P.mid,
                                borderBottom: activeTab === tab ? `2px solid ${P.dark}` : '2px solid transparent',
                                marginBottom: -2,
                            }}>
                                {tabIcon[tab]} {tabLabel[tab]}
                                <span style={{
                                    background: activeTab === tab ? P.mid : P.offwhite,
                                    color: activeTab === tab ? P.offwhite : P.dark,
                                    fontSize: 10, fontWeight: 900, padding: '1px 6px', marginLeft: 4,
                                }}>
                                    {tabData![tab].length}
                                </span>
                            </button>
                        ))}
                        <div style={{ flex: 1 }} />
                        <button
                            onClick={() => printReport(activeTab)}
                            style={{
                                padding: '8px 16px', fontSize: 11, fontWeight: 700,
                                background: 'white', border: `1px solid ${P.mid}`,
                                color: P.mid, cursor: 'pointer', letterSpacing: 0.5,
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            📄 EXPORTAR PDF
                        </button>
                    </div>

                    {/* Tabla del tab activo */}
                    {tabData && (
                        <>
                            <ReportTable
                                rows={tabData[activeTab]}
                                tab={activeTab}
                                details={report.details}
                            />
                            {activeTab === 'trim' && report.callers.length > 0 && (
                                <CallersTable callers={report.callers} />
                            )}
                        </>
                    )}

                    {/* Detalle por mueble */}
                    {report.details.length > 0 && (
                        <div style={{ marginTop: 32 }}>
                            <div style={{
                                background: P.dark, color: P.offwhite,
                                padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: 1,
                            }}>
                                DETALLE POR MUEBLE
                            </div>
                            {report.details.map(d => (
                                <div key={d.item_code} style={{
                                    border: `1px solid ${P.offwhite}`, borderTop: 'none',
                                }}>
                                    <div style={{
                                        background: '#eef2f7', padding: '8px 16px',
                                        display: 'flex', gap: 16, alignItems: 'center',
                                        fontSize: 12,
                                    }}>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: P.mid }}>{d.item_code}</span>
                                        <span style={{ fontWeight: 600, color: P.navy }}>{d.description}</span>
                                        <span style={{ color: P.light }}>× {d.qty} unidades</span>
                                    </div>
                                    {d.parts.filter(p =>
                                        activeTab === 'trim' ? p.categoria === 'TRIM' :
                                            activeTab === 'carton' ? p.categoria === 'CARTON' :
                                                ['SKID', 'VIDRIOS', 'CONTRAPESO'].includes(p.categoria)
                                    ).map((p, i) => (
                                        <div key={i} style={{
                                            display: 'grid', gridTemplateColumns: '120px 1fr 80px 60px 80px',
                                            padding: '6px 16px', gap: 12, fontSize: 12,
                                            background: i % 2 === 0 ? 'white' : '#f8f9fa',
                                            borderTop: `1px solid ${P.offwhite}`,
                                            alignItems: 'center',
                                        }}>
                                            <span style={{ fontFamily: 'monospace', color: P.mid, fontSize: 11 }}>{p.part_code}</span>
                                            <span style={{ color: P.dark }}>{p.part_name}</span>
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, color: 'white', textAlign: 'center',
                                                padding: '2px 6px',
                                                background: p.categoria === 'TRIM' ? P.mid :
                                                    p.categoria === 'CARTON' ? '#b45309' :
                                                        p.categoria === 'SKID' ? '#1d4ed8' :
                                                            p.categoria === 'VIDRIOS' ? '#0891b2' : '#7c3aed',
                                            }}>
                                                {p.categoria}
                                            </span>
                                            <span style={{ textAlign: 'right', color: P.navy, fontWeight: 700 }}>{p.total_qty}</span>
                                            <span style={{ textAlign: 'right', color: P.light, fontSize: 11 }}>{p.um}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {report && report.totalMuebles === 0 && (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: P.light }}>
                    <p style={{ fontSize: 14 }}>No hay entregas registradas en ese período.</p>
                </div>
            )}
        </div>
    )
}

// ── Tabla consolidada ────────────────────────────────────────────────────────
function ReportTable({ rows, tab, details }: {
    rows: ReportRow[]
    tab: 'trim' | 'carton' | 'glass'
    details: DeliveryDetail[]
}) {
    const P = { navy: '#0D1B2A', dark: '#1B263B', mid: '#415A77', light: '#778DA9', offwhite: '#E0E1DD' }

    if (rows.length === 0) return (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: P.light, border: `1px solid ${P.offwhite}` }}>
            <p style={{ fontSize: 14 }}>Sin componentes para este reporte.</p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>Verifica que los muebles entregados tengan BOM cargado.</p>
        </div>
    )

    return (
        <div style={{ border: `1px solid ${P.offwhite}` }}>
            {/* Header */}
            <div style={{
                display: 'grid', gridTemplateColumns: '130px 1fr 100px 70px 70px',
                padding: '10px 16px', gap: 12,
                background: P.mid, color: 'white',
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
            }}>
                <span>CÓDIGO</span>
                <span>DESCRIPCIÓN</span>
                <span>CATEGORÍA</span>
                <span style={{ textAlign: 'right' }}>TOTAL</span>
                <span style={{ textAlign: 'right' }}>UM</span>
            </div>

            {rows.map((r, i) => (
                <div key={r.part_code + i} style={{
                    display: 'grid', gridTemplateColumns: '130px 1fr 100px 70px 70px',
                    padding: '9px 16px', gap: 12,
                    background: i % 2 === 0 ? 'white' : '#f8f9fa',
                    borderTop: `1px solid ${P.offwhite}`,
                    alignItems: 'center', fontSize: 13,
                }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: P.mid, fontWeight: 700 }}>
                        {r.part_code}
                    </span>
                    <span style={{ color: P.navy }}>{r.part_name}</span>
                    <span style={{
                        fontSize: 10, fontWeight: 700, color: 'white', textAlign: 'center',
                        padding: '2px 6px', display: 'inline-block',
                        background: r.categoria === 'TRIM' ? P.mid :
                            r.categoria === 'CARTON' ? '#b45309' :
                                r.categoria === 'SKID' ? '#1d4ed8' :
                                    r.categoria === 'VIDRIOS' ? '#0891b2' : '#7c3aed',
                    }}>
                        {r.categoria}
                    </span>
                    <span style={{ textAlign: 'right', fontWeight: 800, color: P.navy, fontSize: 14 }}>
                        {r.total_qty % 1 === 0 ? r.total_qty : r.total_qty.toFixed(2)}
                    </span>
                    <span style={{ textAlign: 'right', color: P.light, fontSize: 11 }}>{r.um}</span>
                </div>
            ))}

            {/* Footer */}
            <div style={{
                display: 'grid', gridTemplateColumns: '130px 1fr 100px 70px 70px',
                padding: '10px 16px', gap: 12,
                background: P.dark, color: P.offwhite,
                borderTop: `2px solid ${P.mid}`,
                fontSize: 12, fontWeight: 700,
            }}>
                <span />
                <span>{rows.length} componente{rows.length !== 1 ? 's' : ''}</span>
                <span />
                <span style={{ textAlign: 'right' }}>
                    {rows.reduce((s, r) => s + r.total_qty, 0).toFixed(0)}
                </span>
                <span />
            </div>
        </div>
    )
}

// ── StatBox ──────────────────────────────────────────────────────────────────
function StatBox({ label, value }: { label: string; value: string }) {
    return (
        <div style={{
            border: `1px solid #E0E1DD`, padding: '12px 20px', minWidth: 140,
        }}>
            <div style={{ fontSize: 10, color: '#778DA9', fontWeight: 700, letterSpacing: 1 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0D1B2A', marginTop: 4 }}>{value}</div>
        </div>
    )
}

///

function CallersTable({ callers }: { callers: CallerSummary[] }) {
    const P = { navy: '#0D1B2A', dark: '#1B263B', mid: '#415A77', light: '#778DA9', offwhite: '#E0E1DD' }

    if (callers.length === 0) return null

    const totalHB = callers.reduce((s, c) => s + c.HB, 0)
    const totalHK = callers.reduce((s, c) => s + c.HK, 0)
    const totalHR = callers.reduce((s, c) => s + c.HR, 0)
    const totalHH = callers.reduce((s, c) => s + c.HH, 0)

    return (
        <div style={{ marginTop: 24 }}>
            <div style={{
                background: '#7c3aed', color: 'white',
                padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: 1,
            }}>
                🔩 DESGLOSE DE LLAMADORES POR MUEBLE
            </div>
            {/* Header */}
            <div style={{
                display: 'grid', gridTemplateColumns: '120px 1fr 80px 70px 70px 70px 70px',
                padding: '8px 16px', gap: 12,
                background: P.mid, color: 'white',
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
            }}>
                <span>ITEM</span>
                <span>DESCRIPCIÓN</span>
                <span style={{ textAlign: 'center' }}>MUEBLES</span>
                <span style={{ textAlign: 'center' }}>HB</span>
                <span style={{ textAlign: 'center' }}>HK</span>
                <span style={{ textAlign: 'center' }}>HR</span>
                <span style={{ textAlign: 'center' }}>HH</span>
            </div>
            {callers.map((c, i) => (
                <div key={c.item_code} style={{
                    display: 'grid', gridTemplateColumns: '120px 1fr 80px 70px 70px 70px 70px',
                    padding: '8px 16px', gap: 12,
                    background: i % 2 === 0 ? 'white' : '#f8f9fa',
                    borderTop: `1px solid ${P.offwhite}`,
                    fontSize: 13, alignItems: 'center',
                }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: P.mid }}>
                        {c.item_code}
                    </span>
                    <span style={{ color: P.navy, fontSize: 12 }}>{c.description}</span>
                    <span style={{ textAlign: 'center', fontWeight: 800, color: P.navy }}>{c.qty_muebles}</span>
                    {[c.HB, c.HK, c.HR, c.HH].map((v, idx) => (
                        <span key={idx} style={{
                            textAlign: 'center', fontWeight: v > 0 ? 800 : 400,
                            color: v > 0 ? '#7c3aed' : P.light,
                        }}>
                            {v > 0 ? v : '—'}
                        </span>
                    ))}
                </div>
            ))}
            {/* Footer totales */}
            <div style={{
                display: 'grid', gridTemplateColumns: '120px 1fr 80px 70px 70px 70px 70px',
                padding: '8px 16px', gap: 12,
                background: P.dark, color: 'white',
                borderTop: `2px solid ${P.mid}`,
                fontSize: 12, fontWeight: 700,
            }}>
                <span /><span>TOTAL</span>
                <span style={{ textAlign: 'center' }}>
                    {callers.reduce((s, c) => s + c.qty_muebles, 0)}
                </span>
                <span style={{ textAlign: 'center', color: totalHB > 0 ? '#c4b5fd' : P.light }}>{totalHB || '—'}</span>
                <span style={{ textAlign: 'center', color: totalHK > 0 ? '#c4b5fd' : P.light }}>{totalHK || '—'}</span>
                <span style={{ textAlign: 'center', color: totalHR > 0 ? '#c4b5fd' : P.light }}>{totalHR || '—'}</span>
                <span style={{ textAlign: 'center', color: totalHH > 0 ? '#c4b5fd' : P.light }}>{totalHH || '—'}</span>
            </div>
        </div>
    )
}