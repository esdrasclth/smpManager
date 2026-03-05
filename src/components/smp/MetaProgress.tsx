'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { MonthlyGoal } from '@/lib/types'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface Props {
  goal: MonthlyGoal | null
  totalEntregado: number
  pct: number
}

export function MetaProgress({ goal, totalEntregado, pct }: Props) {
  const now = new Date()
  const restante = goal ? Math.max(0, goal.goal_amount - totalEntregado) : 0
  const color = pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-400' : 'bg-orange-500'
  const textColor = pct >= 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-orange-500'

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
            </h2>
            <p className="text-sm text-slate-500">Cumplimiento de meta mensual</p>
          </div>
          <span className={`text-4xl font-black ${textColor}`}>{pct}%</span>
        </div>

        {/* Barra de progreso */}
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-700 ${color}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <p className="text-2xl font-black text-green-600">{totalEntregado.toLocaleString()}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">ENTREGADO</p>
          </div>
          <div className="text-center border-x border-slate-100">
            <p className="text-2xl font-black text-orange-500">
              {goal ? goal.goal_amount.toLocaleString() : '—'}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">META</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-slate-700">{restante.toLocaleString()}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {restante === 0 && goal ? '🎉 LOGRADA' : 'RESTANTE'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}