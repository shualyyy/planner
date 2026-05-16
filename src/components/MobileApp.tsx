import { useState } from 'react'
import CalendarScreen from './CalendarScreen'
import TasksScreen from './TasksScreen'
import AssistantScreen from './AssistantScreen'
import WinsScreen from './WinsScreen'
import SettingsScreen from './SettingsScreen'
import AddTaskModal from './AddTaskModal'
import { useTaskStore, groupTasksByDay } from '../store/taskStore'
import {
  CalendarTabIcon,
  TasksTabIcon,
  AssistantTabIcon,
  WinsTabIcon,
  SettingsTabIcon,
} from './icons'
import type { Task } from '../services/supabase'

type Tab = 'calendar' | 'tasks' | 'assistant' | 'wins' | 'settings'

const TABS: { id: Tab; Icon: React.FC<{ color: string }> }[] = [
  { id: 'calendar', Icon: CalendarTabIcon },
  { id: 'tasks', Icon: TasksTabIcon },
  { id: 'assistant', Icon: AssistantTabIcon },
  { id: 'wins', Icon: WinsTabIcon },
  { id: 'settings', Icon: SettingsTabIcon },
]

export default function MobileApp() {
  const { tasks, donIds, toggleDone, deleteTask } = useTaskStore()
  const [tab, setTab] = useState<Tab>('tasks')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState<Date>(new Date())
  const [modalTime, setModalTime] = useState('')
  const [editTask, setEditTask] = useState<Task | null>(null)

  const grouped = groupTasksByDay(tasks, donIds)

  function handleAdd(date?: Date, time?: string) {
    setModalDate(date || new Date())
    setModalTime(time || '')
    setEditTask(null)
    setModalOpen(true)
  }

  function handleEdit(task: Task) {
    setEditTask(task)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTask(null)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* Panels — all mounted, active one visible */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, display: tab === 'calendar' ? 'flex' : 'none', flexDirection: 'column' }}>
          <CalendarScreen
            tasks={grouped}
            onAdd={(d, t) => handleAdd(d, t)}
            onToggle={(_dk, id) => toggleDone(id)}
          />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: tab === 'tasks' ? 'flex' : 'none', flexDirection: 'column' }}>
          <TasksScreen
            tasks={grouped}
            onToggle={(_dk, id) => toggleDone(id)}
            onDelete={(_dk, id) => deleteTask(id)}
            onEdit={handleEdit}
            onAdd={() => handleAdd()}
          />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: tab === 'assistant' ? 'flex' : 'none', flexDirection: 'column' }}>
          <AssistantScreen />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: tab === 'wins' ? 'flex' : 'none', flexDirection: 'column' }}>
          <WinsScreen />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: tab === 'settings' ? 'flex' : 'none', flexDirection: 'column' }}>
          <SettingsScreen />
        </div>
      </div>

      {/* Floating pill tab bar */}
      <div className="tabbar-wrap">
        <div className="tabbar">
          {TABS.map(({ id, Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                className="tab"
                onClick={() => setTab(id)}
              >
                <Icon color={active ? 'var(--accent)' : 'var(--text-muted)'} />
                {active && <div className="tab-glow" />}
              </button>
            )
          })}
        </div>
      </div>

      <AddTaskModal
        isOpen={modalOpen || editTask !== null}
        onClose={closeModal}
        defaultDate={modalDate}
        defaultTime={modalTime}
        editTask={editTask ?? undefined}
      />
    </div>
  )
}
