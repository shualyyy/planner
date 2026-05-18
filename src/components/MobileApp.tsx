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
  IcoPlus,
} from './icons'
import type { Task } from '../services/supabase'

type Tab = 'calendar' | 'tasks' | 'assistant' | 'wins' | 'settings'

const TABS: { id: Tab; Icon: React.FC<{ color: string }>; label: string }[] = [
  { id: 'calendar', Icon: CalendarTabIcon, label: 'Today' },
  { id: 'tasks',    Icon: TasksTabIcon,    label: 'Tasks' },
  { id: 'assistant',Icon: AssistantTabIcon,label: 'Ask'   },
  { id: 'wins',     Icon: WinsTabIcon,     label: 'Wins'  },
  { id: 'settings', Icon: SettingsTabIcon, label: 'You'   },
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

  // Tab bar rendered via portal directly into body — bypasses iOS fixed-in-fixed bug
  const tabBar = createPortal(
    <div className="tabbar">
      {TABS.map(({ id, Icon, label }) => {
        const active = tab === id
        return (
          <button key={id} className={`tab${active ? ' on' : ''}`} onClick={() => setTab(id)}>
            <span className="tab-icon">
              <Icon color={active ? 'var(--accent)' : 'var(--text-muted)'} />
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
        {/* Panels — all mounted, active one visible */}
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
              onAdd={() => handleAdd()}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'assistant' ? 'flex' : 'none', flexDirection: 'column' }}>
            <AssistantScreen />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'wins' ? 'flex' : 'none', flexDirection: 'column' }}>
            <WinsScreen tasks={tasks.map(t => ({ ...t, done: donIds.has(t.id) }))} />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'settings' ? 'flex' : 'none', flexDirection: 'column' }}>
            <SettingsScreen />
          </div>
        </div>
      </div>

      {/* Tab bar via portal — hidden when calendar day popup is open */}
      {!calPopupOpen && tabBar}

      {/* FAB via portal — shown only on calendar and tasks tabs */}
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
