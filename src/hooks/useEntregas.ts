'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Delivery, MonthlyGoal, FurnitureItem, VariantStyle } from '@/lib/types'

export function useEntregas() {
  const supabase = createClient()
  const now = new Date()

  const [deliveries, setDeliveries]         = useState<Delivery[]>([])
  const [goal, setGoal]                     = useState<MonthlyGoal | null>(null)
  const [furnitureItems, setFurnitureItems] = useState<FurnitureItem[]>([])
  const [variantStyles, setVariantStyles]   = useState<VariantStyle[]>([])
  const [loading, setLoading]               = useState(true)

  const fetchAll = useCallback(async () => {
    const [{ data: dels }, { data: goalData }, { data: furniture }, { data: variants }] =
      await Promise.all([
        supabase
          .from('deliveries')
          .select('*, furniture_items(*), delivery_variants(*)')
          .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('monthly_goals')
          .select('*')
          .eq('month', now.getMonth() + 1)
          .eq('year', now.getFullYear())
          .maybeSingle(),
        supabase.from('furniture_items').select('*').eq('active', true).order('item_code'),
        supabase.from('variant_styles').select('*').eq('active', true),
      ])

    setDeliveries((dels as Delivery[]) ?? [])
    setGoal(goalData)
    setFurnitureItems((furniture as FurnitureItem[]) ?? [])
    setVariantStyles((variants as VariantStyle[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function saveGoal(amount: number) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('monthly_goals').upsert({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      goal_amount: amount,
      set_by: user!.id,
    }, { onConflict: 'month,year' })
    fetchAll()
  }

  async function addDelivery(payload: {
    furniture_id: string
    qty: number
    unit_price: number
    comentario: string
    variants: { variant_type: string; style_name: string; qty: number }[]
  }) {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: delivery, error } = await supabase
      .from('deliveries')
      .insert({
        furniture_id: payload.furniture_id,
        qty: payload.qty,
        unit_price: payload.unit_price,
        comentario: payload.comentario || null,
        created_by: user!.id,
      })
      .select()
      .single()

    if (error || !delivery) return

    if (payload.variants.length > 0) {
      await supabase.from('delivery_variants').insert(
        payload.variants.map(v => ({ ...v, delivery_id: delivery.id }))
      )
    }

    fetchAll()
  }

  async function deleteDelivery(id: string) {
    await supabase.from('deliveries').delete().eq('id', id)
    fetchAll()
  }

  const totalEntregado = deliveries.reduce((s, d) => s + d.qty, 0)
  const totalDollars   = deliveries.reduce((s, d) => s + ((d.unit_price ?? d.furniture_items?.price ?? 0) * d.qty), 0)
  const pct = goal ? Math.round((totalDollars / goal.goal_amount) * 100) : 0

  return {
    deliveries, goal, furnitureItems, variantStyles,
    loading, totalEntregado, totalDollars, pct,
    saveGoal, addDelivery, deleteDelivery, fetchAll,
  }
}