import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tu-proyecto.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_L_vg-YpvCMf4Qfbr0ftkJw_4q2Z0E5m'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
