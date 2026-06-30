import { create } from 'zustand'
import { supabase, type Task, type Project, type Habit, type HabitLog } from '../services/supabase'

interface TaskStore {
  tasks: Task[]
  projects: Project[]
  habits: Habit[]
  habitLogs: HabitLog[]
  loading: boolean
  donIds: Set<string>
  theme: 'light' | 'dark'
  fetchTasks: () => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  fetchProjects: () => Promise<void>
  addProject: (p: Omit<Project, 'id' | 'created_at'>) => Promise<Project>
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  fetchHabits: () => Promise<void>
  addHabit: (h: Omit<Habit, 'id' | 'created_at'>) => Promise<void>
  toggleHabitLog: (habitId: string, date: string) => Promise<void>
  setTheme: (t: 'light' | 'dark') => void
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  projects: [],
  habits: [],
  habitLogs: [],
  loading: false,
  donIds: new Set(),
  theme: 'dark',

  setTheme: (t) => {
    document.documentElement.setAttribute('data-theme', t)
    set({ theme: t })
  },

  fetchTasks: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('task_date', { ascending: true })
    if (!error && data) {
      const tasks = data as Task[]
      const donIds = new Set(tasks.filter(t => t.is_done).map(t => t.id))
      set({ tasks, donIds })
    }
    set({ loading: false })
  },

  addTask: async (task) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...task, is_done: false }])
      .select()
    if (error) throw new Error(`Supabase insert error: ${error.message} (code: ${error.code})`)
    const inserted = data?.[0] as Task | undefined
    if (!inserted) throw new Error('Task not saved — check Supabase RLS: anon insert may be blocked')
    set((state) => ({
      tasks: [...state.tasks, inserted].sort((a, b) => {
        const dc = a.task_date.localeCompare(b.task_date)
        if (dc !== 0) return dc
        if (!a.task_time && !b.task_time) return 0
        if (!a.task_time) return 1
        if (!b.task_time) return -1
        return a.task_time.localeCompare(b.task_time)
      }),
    }))
  },

  updateTask: async (id, updates) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (error) throw error
    set((state) => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
    }))
  },

  deleteTask: async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    set((state) => {
      const nextDone = new Set(state.donIds)
      nextDone.delete(id)
      return {
        tasks: state.tasks.filter(t => t.id !== id),
        donIds: nextDone,
      }
    })
  },

  toggleDone: async (id: string) => {
    let isDoneNow = false
    set((state) => {
      const next = new Set(state.donIds)
      isDoneNow = !next.has(id)
      if (isDoneNow) next.add(id)
      else next.delete(id)
      return { donIds: next }
    })
    const { error } = await supabase.from('tasks').update({ is_done: isDoneNow }).eq('id', id)
    if (error) {
      // Revert optimistic update on failure
      set((state) => {
        const next = new Set(state.donIds)
        if (isDoneNow) next.delete(id)
        else next.add(id)
        return { donIds: next }
      })
      console.error('toggleDone failed:', error)
    }
  },

  fetchProjects: async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error && data) set({ projects: data as Project[] })
  },

  addProject: async (p) => {
    const { data, error } = await supabase
      .from('projects')
      .insert([p])
      .select()
    if (error) throw new Error(`Supabase insert error: ${error.message} (code: ${error.code})`)
    const inserted = data?.[0] as Project | undefined
    if (!inserted) throw new Error('Project not saved — check Supabase RLS: anon insert may be blocked')
    set((state) => ({ projects: [...state.projects, inserted] }))
    return inserted
  },

  updateProject: async (id, updates) => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id)
    if (error) throw error
    set((state) => ({
      projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p),
    }))
  },

  deleteProject: async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw error
    set((state) => ({
      projects: state.projects.filter(p => p.id !== id),
      // Detach tasks from the deleted project (DB does ON DELETE SET NULL)
      tasks: state.tasks.map(t => t.project_id === id ? { ...t, project_id: null } : t),
    }))
  },

  fetchHabits: async () => {
    const [hRes, lRes] = await Promise.all([
      supabase.from('habits').select('*').order('created_at', { ascending: true }),
      supabase.from('habit_logs').select('*'),
    ])
    if (!hRes.error && hRes.data) set({ habits: hRes.data as Habit[] })
    if (!lRes.error && lRes.data) set({ habitLogs: lRes.data as HabitLog[] })
  },

  addHabit: async (h) => {
    const { data, error } = await supabase.from('habits').insert([h]).select()
    if (error) throw new Error(`Supabase insert error: ${error.message} (code: ${error.code})`)
    const inserted = data?.[0] as Habit | undefined
    if (!inserted) throw new Error('Habit not saved — check Supabase RLS: anon insert may be blocked')
    set((state) => ({ habits: [...state.habits, inserted] }))
  },

  toggleHabitLog: async (habitId, date) => {
    const existing = get().habitLogs.find(l => l.habit_id === habitId && l.completed_date === date)
    if (existing) {
      // Optimistic remove
      set((state) => ({ habitLogs: state.habitLogs.filter(l => l.id !== existing.id) }))
      const { error } = await supabase.from('habit_logs').delete().eq('id', existing.id)
      if (error) { set((state) => ({ habitLogs: [...state.habitLogs, existing] })); console.error('toggleHabitLog failed:', error) }
    } else {
      const { data, error } = await supabase
        .from('habit_logs')
        .insert([{ habit_id: habitId, completed_date: date }])
        .select()
      if (error) { console.error('toggleHabitLog failed:', error); return }
      const inserted = data?.[0] as HabitLog | undefined
      if (inserted) set((state) => ({ habitLogs: [...state.habitLogs, inserted] }))
    }
  },
}))

// Ensure data-theme="dark" is set on <html> from the very first render
useTaskStore.getState().setTheme('dark')

function addDaysToDate(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function addMonthsToDate(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate())
}
/** Add n months to a base date, anchored to the original day-of-month and
 *  clamped to the target month's last valid day (Jan 31 +1mo → Feb 28/29). */
function addMonthsClamped(base: Date, n: number, anchorDay: number): Date {
  const m = base.getMonth() + n
  const y = base.getFullYear() + Math.floor(m / 12)
  const tm = ((m % 12) + 12) % 12
  const daysInMonth = new Date(y, tm + 1, 0).getDate()
  return new Date(y, tm, Math.min(anchorDay, daysInMonth), 12, 0, 0)
}
function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/** Groups Task[] into Record<'yyyy-MM-dd', (Task & { done: boolean })[]>
 *  Expands recurring tasks into virtual instances for ±1 year */
export function groupTasksByDay(
  tasks: Task[],
  donIds: Set<string>
): Record<string, (Task & { done: boolean })[]> {
  const acc: Record<string, (Task & { done: boolean })[]> = {}
  const horizon = dateToKey(addMonthsToDate(new Date(), 12))

  for (const t of tasks) {
    // Original
    if (!acc[t.task_date]) acc[t.task_date] = []
    acc[t.task_date].push({ ...t, done: donIds.has(t.id) })

    // Recurring instances
    if (t.recurrence) {
      const base = new Date(t.task_date + 'T12:00:00')
      const anchorDay = base.getDate()
      let cur = base
      for (let i = 0; i < 366; i++) {
        if (t.recurrence === 'daily')   cur = addDaysToDate(cur, 1)
        else if (t.recurrence === 'weekly')  cur = addDaysToDate(cur, 7)
        else if (t.recurrence === 'monthly') cur = addMonthsClamped(base, i + 1, anchorDay)
        const dk = dateToKey(cur)
        if (dk > horizon) break
        if (!acc[dk]) acc[dk] = []
        // Same id — done state shared across instances
        acc[dk].push({ ...t, task_date: dk, done: donIds.has(t.id) })
      }
    }
  }
  return acc
}
