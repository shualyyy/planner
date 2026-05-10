import { create } from 'zustand'
import { supabase, type Task } from '../services/supabase'

interface TaskStore {
  tasks: Task[]
  loading: boolean
  donIds: Set<string>           // local-only done state
  fetchTasks: () => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>
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
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('tasks').insert([{ ...task, user_id: user?.id }])
    if (error) throw error
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('task_date', { ascending: true })
    if (data) set({ tasks: data as Task[] })
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
