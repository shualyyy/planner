import { create } from 'zustand'
import { supabase, type Task } from '../services/supabase'

interface TaskStore {
  tasks: Task[]
  loading: boolean
  donIds: Set<string>
  theme: 'light' | 'dark'
  fetchTasks: () => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  setTheme: (t: 'light' | 'dark') => void
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  loading: false,
  donIds: new Set(),
  theme: 'light',

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
      .single()
    if (error) throw error
    set((state) => ({
      tasks: [...state.tasks, data as Task].sort((a, b) => {
        const dateCompare = a.task_date.localeCompare(b.task_date)
        if (dateCompare !== 0) return dateCompare
        return (a.task_time ?? '￿').localeCompare(b.task_time ?? '￿')
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
}))

/** Groups Task[] into Record<'yyyy-MM-dd', (Task & { done: boolean })[]> */
export function groupTasksByDay(
  tasks: Task[],
  donIds: Set<string>
): Record<string, (Task & { done: boolean })[]> {
  return tasks.reduce((acc, t) => {
    if (!acc[t.task_date]) acc[t.task_date] = []
    acc[t.task_date].push({ ...t, done: donIds.has(t.id) })
    return acc
  }, {} as Record<string, (Task & { done: boolean })[]>)
}
