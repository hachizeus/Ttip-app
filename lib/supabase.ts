import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Worker = {
  id: string
  name: string
  gender: string
  occupation: string
  phone: string
  worker_id: string
  qr_code: string
  subscription_plan: 'free' | 'lite' | 'pro'
  subscription_expiry: string | null
  total_tips: number
  tip_count: number
  profile_image_url?: string
  created_at: string
}

export type Tip = {
  id: string
  worker_id: string
  amount: number
  customer_phone: string
  transaction_id: string
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}