import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Product = {
  id: string
  section: string
  brand_model: string
  colour: string | null
  capacity: string | null
  garantie: string | null
  price_per_unit: number
  usp: string | null
  created_at?: string
  updated_at?: string
}

export type OfferItem = {
  product: Product
  quantity: number
  subtotal: number
}

export type ManpowerItem = {
  days: number
  people: number
  daily_rate: number
  subtotal: number
}

export type Offer = {
  id?: string
  offer_number: string
  version: number
  date: string
  first_name: string
  last_name: string
  salutation: string
  address: string
  postal_code: string
  email: string
  phone: string
  items: OfferItem[]
  manpower: ManpowerItem
  mobilization_fee: number
  mobilization_enabled: boolean
  total_price: number
  created_at?: string
}

export const SECTIONS = [
  'Solar modules',
  'Optimizer',
  'Mounting System',
  'Battery',
  'Energy Manager',
  'Inverter',
  'Wallbox',
]
