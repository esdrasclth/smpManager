'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FurnitureItem } from '@/lib/types'
import { updateFurnitureItem } from '@/app/actions/furniture'

export function useFurniture() {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const createItem = useCallback(async (payload: Omit<FurnitureItem, 'id' | 'active'>) => {
    setSaving(true)
    const { error } = await supabase.from('furniture_items').insert({ ...payload, active: true })
    setSaving(false)
    return error
  }, [])

  const updateItem = useCallback(async (id: string, payload: Partial<FurnitureItem>) => {
    setSaving(true)
    const { error } = await updateFurnitureItem(id, payload as Record<string, unknown>)
    setSaving(false)
    return error ? { message: error } : null
  }, [])

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    await supabase.from('furniture_items').update({ active }).eq('id', id)
  }, [])

  return { saving, createItem, updateItem, toggleActive }
}