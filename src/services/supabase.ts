import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  document.body.innerHTML =
    '<div style="color:#e5e5e5;background:#0f0f0f;height:100vh;display:flex;align-items:center;' +
    'justify-content:center;font-family:sans-serif;font-size:14px;text-align:center;padding:24px">' +
    '⚠ Missing environment variables.<br>Set <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b>' +
    ' in Cloudflare Pages → Settings → Environment variables.</div>'
  throw new Error('Missing Supabase env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Task {
  id: string
  title: string
  task_date: string
  task_time: string | null
  task_time_end: string | null
  is_all_day: boolean
  description: string | null
  created_at: string
}
