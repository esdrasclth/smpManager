'use server'

import { createClient } from '@/lib/supabase/server'

export async function updateFurnitureItem(id: string, payload: Record<string, unknown>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('furniture_items')
    .update(payload)
    .eq('id', id)
  return { error: error?.message ?? null }
}