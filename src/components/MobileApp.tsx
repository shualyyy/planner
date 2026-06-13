import { useState } from 'react'
import { createPortal } from 'react-dom'
import CalendarScreen from './CalendarScreen'
import TasksScreen from './TasksScreen'
import AssistantScreen from './AssistantScreen'
import NotesScreen from './NotesScreen'
import SettingsScreen from './SettingsScreen'
import AddTaskModal from './AddTaskModal'
import { useTaskStore, groupTasksByDay } from '../store/taskStore'
import {
  CalendarTabIcon,
  TasksTabIcon,
  AssistantTabIcon,
  SettingsTabIcon,
  IcoPlus,
} from './icons'
import type { Task } from '../services/supabase'

type Tab = 'calendar' | 'tasks' | 'assistant' | 'notes' | 'settings'

const NotesTabIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
  </svg>
)

const TABS: { id: Tab; Icon: React.FC<{ color: string }>; label: string }[] = [
  { id: 'calendar', Icon: CalendarTabIcon, label: 'Today'  },
  { id: 'tasks',    Icon: TasksTabIcon,    label: 'Tasks'  },
  { id: 'assistant',Icon: AssistantTabIcon,label: 'Ask'    },
  { id: 'notes',    Icon: NotesTabIcon,    label: 'Notes'  },
  { id: 'settings', Icon: SettingsTabIcon, label: 'You'    },
]

export default function MobileApp() {
  const { tasks, donIds, toggleDone, deleteTask } = useTaskStore()
  const [tab, setTab] = useState<Tab>('tasks')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState<Date>(new Date())
  const [modalTime, setModalTime] = useState('')
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [calPopupOpen, setCalPopupOpen] = useState(false)

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

  const showFab = (tab === 'calendar' || tab === 'tasks') && !calPopupOpen

  const tabBar = createPortal(
    <div className="tabbar">
      {TABS.map(({ id, Icon, label }) => {
        const active = tab === id
        return (
          <button key={id} className={`tab${active ? ' on' : ''}`} onClick={() => setTab(id)}>
            <span className="tab-icon">
              <Icon color={active ? '#ffffff' : 'rgba(255,255,255,0.45)'} />
            </span>
            <span className="tab-label">{label}</span>
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
        <div style={{ position: 'absolute', top: 'env(safe-area-inset-top)', left: 0, right: 0, bottom: 0 }}>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'calendar' ? 'flex' : 'none', flexDirection: 'column' }}>
            <CalendarScreen
              tasks={grouped}
              onAdd={(d, t) => handleAdd(d, t)}
              onToggle={(_dk, id) => toggleDone(id)}
              onPopupChange={setCalPopupOpen}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'tasks' ? 'flex' : 'none', flexDirection: 'column' }}>
            <TasksScreen
              tasks={grouped}
              onToggle={(_dk, id) => toggleDone(id)}
              onDelete={(_dk, id) => deleteTask(id)}
              onEdit={handleEdit}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'assistant' ? 'flex' : 'none', flexDirection: 'column' }}>
            <AssistantScreen />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'notes' ? 'flex' : 'none', flexDirection: 'column' }}>
            <NotesScreen />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'settings' ? 'flex' : 'none', flexDirection: 'column' }}>
            <SettingsScreen />
          </div>
        </div>
      </div>

      {!calPopupOpen && tabBar}

      {showFab && createPortal(
        <button className="fab-v2" onClick={() => handleAdd()}>
          <IcoPlus size={22} />
        </button>,
        document.body
      )}

      <AddTaskModal
        isOpen={modalOpen}
        onClose={closeModal}
        defaultDate={modalDate}
        defaultTime={modalTime}
        editTask={editTask ?? undefined}
      />
    </>
  )
}
