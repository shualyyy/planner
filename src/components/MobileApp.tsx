import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import CalendarScreen from './CalendarScreen'
import TasksScreen from './TasksScreen'
import ProjectsScreen from './ProjectsScreen'
import AssistantScreen from './AssistantScreen'
import SettingsScreen from './SettingsScreen'
import AddTaskModal from './AddTaskModal'
import AddProjectModal from './AddProjectModal'
import { useTaskStore, groupTasksByDay } from '../store/taskStore'
import {
  CalendarTabIcon,
  TasksTabIcon,
  SettingsTabIcon,
  IcoPlus,
} from './icons'
import type { Task, Project } from '../services/supabase'

type Tab = 'calendar' | 'tasks' | 'projects' | 'assistant' | 'settings'

const ProjectsTabIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
  </svg>
)

const AssistantTabIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
)

const TABS: { id: Tab; Icon: React.FC<{ color: string }>; label: string }[] = [
  { id: 'calendar',  Icon: CalendarTabIcon,  label: 'Calendar' },
  { id: 'tasks',     Icon: TasksTabIcon,     label: 'Tasks'    },
  { id: 'projects',  Icon: ProjectsTabIcon,  label: 'Projects' },
  { id: 'assistant', Icon: AssistantTabIcon, label: 'AI'       },
  { id: 'settings',  Icon: SettingsTabIcon,  label: 'You'      },
]

export default function MobileApp() {
  const { tasks, donIds, toggleDone, deleteTask, pendingInvites, fetchPendingInvites } = useTaskStore()

  useEffect(() => { fetchPendingInvites() }, [fetchPendingInvites])

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  const [tab, setTab] = useState<Tab>('tasks')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState<Date>(new Date())
  const [modalTime, setModalTime] = useState('')
  const [modalProjectId, setModalProjectId] = useState<string | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [calPopupOpen, setCalPopupOpen] = useState(false)
  const [projectDetailOpen, setProjectDetailOpen] = useState(false)
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)

  const grouped = groupTasksByDay(tasks, donIds)

  function handleAdd(date?: Date, time?: string, projectId?: string) {
    setModalDate(date || new Date())
    setModalTime(time || '')
    setModalProjectId(projectId ?? null)
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

  function handleAddProject() {
    setEditProject(null)
    setAddProjectModalOpen(true)
  }

  function handleEditProject(p: Project) {
    setEditProject(p)
    setAddProjectModalOpen(true)
  }

  function closeProjectModal() {
    setAddProjectModalOpen(false)
    setEditProject(null)
  }

  const showFab = (tab === 'calendar' || tab === 'tasks' || tab === 'projects') && !calPopupOpen && !projectDetailOpen


  const tabBar = createPortal(
    <div className="tabbar">
      {TABS.map(({ id, Icon, label }) => {
        const active = tab === id
        return (
          <button key={id} className={`tab${active ? ' on' : ''}`} onClick={() => setTab(id)}>
            <span className="tab-icon" style={{ position: 'relative' }}>
              <Icon color={active ? '#D97757' : 'rgba(255,255,255,0.35)'} />
              {id === 'settings' && pendingInvites.length > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -3,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--danger)',
                  boxShadow: '0 0 0 2px var(--tabbar-bg)',
                }} />
              )}
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
      {!isOnline && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'var(--warning)', color: '#1C1917',
          padding: 'calc(env(safe-area-inset-top, 0px) + 6px) 12px 6px',
          textAlign: 'center', font: '600 11px/1.2 var(--font-sans)', letterSpacing: '0.04em',
        }}>
          ⚡ Offline — changes will sync when reconnected
        </div>,
        document.body
      )}
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
          <div style={{ position: 'absolute', inset: 0, display: tab === 'projects' ? 'flex' : 'none', flexDirection: 'column' }}>
            <ProjectsScreen
              tasks={grouped}
              onToggle={(_dk, id) => toggleDone(id)}
              onDelete={(_dk, id) => deleteTask(id)}
              onEdit={handleEdit}
              onAddProject={handleAddProject}
              onEditProject={handleEditProject}
              onAddTask={(projectId) => handleAdd(undefined, undefined, projectId)}
              onDetailChange={setProjectDetailOpen}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'assistant' ? 'flex' : 'none', flexDirection: 'column' }}>
            <AssistantScreen />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'settings' ? 'flex' : 'none', flexDirection: 'column' }}>
            <SettingsScreen />
          </div>
        </div>
      </div>

      {!calPopupOpen && tabBar}

      {showFab && createPortal(
        <button className="fab-v2" onClick={() => tab === 'projects' ? handleAddProject() : handleAdd()}>
          <IcoPlus size={22} />
        </button>,
        document.body
      )}

      <AddTaskModal
        isOpen={modalOpen}
        onClose={closeModal}
        defaultDate={modalDate}
        defaultTime={modalTime}
        defaultProjectId={modalProjectId}
        editTask={editTask ?? undefined}
      />

      <AddProjectModal
        isOpen={addProjectModalOpen}
        onClose={closeProjectModal}
        editProject={editProject ?? undefined}
      />
    </>
  )
}
