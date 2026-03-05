export type Role = 'admin' | 'supervisor' | 'asistente' | 'operador'

export interface Profile {
  id: string
  nombre: string
  role: Role
  active: boolean
  created_at: string
}

export interface FurnitureItem {
  id: string
  item_code: string
  description: string
  price: number
  categoria: string
  coleccion: string
  has_legs: boolean
  has_callers: boolean
  has_top: boolean
  active: boolean
}

export interface VariantStyle {
  id: string
  variant_type: 'leg' | 'caller' | 'top'  
  name: string
}

export interface MonthlyGoal {
  id: string
  month: number
  year: number
  goal_amount: number
}

export interface DeliveryVariant {
  variant_type: 'caller' | 'leg' | 'top'
  style_name: string
  qty: number
}

export interface Delivery {
  id: string
  furniture_id: string
  qty: number
  unit_price: number   // ← agregar
  comentario: string | null
  created_by: string
  created_at: string
  furniture_items: FurnitureItem
  delivery_variants: DeliveryVariant[]
}