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

export type RecurrenceType = 'daily' | 'weekly' | 'monthly'

export interface Task {
  id: string
  title: string
  task_date: string
  task_time: string | null
  task_time_end: string | null
  is_all_day: boolean
  is_done?: boolean
  description: string | null
  created_at: string
  label?: TaskLabel
  recurrence?: RecurrenceType | null
  is_pinned?: boolean
  pin_end?: string | null   // 'yyyy-MM-dd' until which date to show as pinned
  project_id?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  time_estimate?: number | null  // minutes
  assigned_to?: string | null
  assigned_by?: string | null
}

export interface UserProfile {
  id: string
  display_name: string | null
  email: string | null
  planer_id: string
  avatar_color: string
  created_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: 'owner' | 'editor' | 'viewer'
  joined_at: string
  profile?: UserProfile
}

export interface ProjectInvite {
  id: string
  project_id: string
  invited_by: string
  planer_id: string
  role: 'editor' | 'viewer'
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'

export const TASK_STATUSES: Record<TaskStatus, { name: string; color: string; icon: string }> = {
  not_started: { name: 'To Do',       color: '#9BA8AB', icon: '○' },
  in_progress: { name: 'In Progress', color: '#D97757', icon: '◑' },
  blocked:     { name: 'Blocked',     color: '#FF5C5C', icon: '⊘' },
  done:        { name: 'Done',        color: '#3DD68C', icon: '●' },
}

export const TASK_PRIORITIES: Record<TaskPriority, { name: string; color: string }> = {
  high:   { name: 'High',   color: '#FF5C5C' },
  medium: { name: 'Medium', color: '#E8A24A' },
  low:    { name: 'Low',    color: 'rgba(255,255,255,0.3)' },
}

export interface Project {
  id: string
  name: string
  color: string
  description: string | null
  is_archived: boolean
  created_at: string
}

export interface Habit {
  id: string
  name: string
  icon: string
  color: string
  frequency: 'daily' | 'weekly'
  time_of_day: 'morning' | 'evening' | 'anytime'
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  completed_date: string  // 'yyyy-MM-dd'
  created_at: string
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
  if (!stripped && label === 'personal') return ''
  return stripped ? `[${label}] ${stripped}` : `[${label}]`
}
