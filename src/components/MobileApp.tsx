import { useState } from 'react'
import { createPortal } from 'react-dom'
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

  // Tab bar rendered via portal directly into body — bypasses iOS fixed-in-fixed bug
  const tabBar = createPortal(
    <div style={{
      position: 'fixed',
      bottom: '2px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      background: 'var(--surface)',
      borderRadius: '999px',
      padding: '8px 12px',
      boxShadow: '0 4px 24px var(--shadow), 0 0 0 1px var(--border)',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {TABS.map(({ id, Icon }) => {
        const active = tab === id
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              width: '44px', height: '44px',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Icon color={active ? 'var(--accent)' : 'var(--text-muted)'} />
            {active && (
              <span style={{
                position: 'absolute',
                bottom: '4px', left: '50%',
                transform: 'translateX(-50%)',
                width: '4px', height: '4px',
                borderRadius: '50%',
                background: 'var(--accent)',
              }} />
            )}
          </button>
        )
      })}
    </div>,
    document.body
  )

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        {/* Panels — all mounted, active one visible */}
        <div style={{ position: 'absolute', top: 'env(safe-area-inset-top)', left: 0, right: 0, bottom: 0 }}>
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
      </div>

      {/* Tab bar via portal — not clipped by parent stacking context */}
      {tabBar}

      <AddTaskModal
        isOpen={modalOpen || editTask !== null}
        onClose={closeModal}
        defaultDate={modalDate}
        defaultTime={modalTime}
        editTask={editTask ?? undefined}
      />
    </>
  )
}
