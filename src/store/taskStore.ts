import { create } from 'zustand'
import { supabase, type Task } from '../services/supabase'

interface TaskStore {
  tasks: Task[]
  loading: boolean
  donIds: Set<string>           // local-only done state
  fetchTasks: () => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleDone: (id: string) => void
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  loading: false,
  donIds: new Set(),

  fetchTasks: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('task_date', { ascending: true })
    if (!error && data) set({ tasks: data as Task[] })
    set({ loading: false })
  },

  addTask: async (task) => {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...task, user_id: userId }])
      .select()
      .single()
    if (error) throw error
    set((state) => ({
      tasks: [...state.tasks, data as Task].sort((a, b) => a.task_date.localeCompare(b.task_date)),
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

  toggleDone: (id: string) => {
    set((state) => {
      const next = new Set(state.donIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { donIds: next }
    })
  },
}))
