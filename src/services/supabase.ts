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

export type TaskLabel = 'work' | 'personal' | 'health' | 'family' | 'travel'

export const TASK_LABELS: Record<TaskLabel, { name: string; color: string }> = {
  work:     { name: 'Work',     color: '#B8D4F2' },
  personal: { name: 'Personal', color: '#F5BDD0' },
  health:   { name: 'Health',   color: '#8ED4C8' },
  family:   { name: 'Family',   color: '#F5E28A' },
  travel:   { name: 'Travel',   color: '#C8B4E8' },
}

export interface Task {
  id: string
  title: string
  task_date: string
  task_time: string | null
  task_time_end: string | null
  is_all_day: boolean
  description: string | null
  created_at: string
  label?: TaskLabel
}

/** Parse label from description prefix "[label] ..." */
export function parseLabelFromDescription(desc: string | null): TaskLabel {
  if (!desc) return 'personal'
  const m = desc.match(/^\[([a-z]+)\]/)
  if (m && m[1] in TASK_LABELS) return m[1] as TaskLabel
  return 'personal'
}

/** Strip label prefix from description */
export function stripLabelFromDescription(desc: string | null): string {
  if (!desc) return ''
  return desc.replace(/^\[[a-z]+\]\s*/, '')
}

/** Encode label as prefix in description */
export function encodeLabelInDescription(label: TaskLabel, desc: string): string {
  const stripped = desc.replace(/^\[[a-z]+\]\s*/, '').trim()
  return stripped ? `[${label}] ${stripped}` : `[${label}]`
}
