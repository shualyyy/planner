import { useState } from 'react'
import { createPortal } from 'react-dom'
import CalendarScreen from './CalendarScreen'
import TasksScreen from './TasksScreen'
import ProjectsScreen from './ProjectsScreen'
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

type Tab = 'calendar' | 'tasks' | 'projects' | 'settings'

const ProjectsTabIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
  </svg>
)

const TABS: { id: Tab; Icon: React.FC<{ color: string }>; label: string }[] = [
  { id: 'calendar', Icon: CalendarTabIcon, label: 'Calendar' },
  { id: 'tasks',    Icon: TasksTabIcon,    label: 'Tasks'    },
  { id: 'projects', Icon: ProjectsTabIcon, label: 'Work'     },
  { id: 'settings', Icon: SettingsTabIcon, label: 'You'      },
]

export default function MobileApp() {
  const { tasks, donIds, toggleDone, deleteTask } = useTaskStore()
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
            <span className="tab-icon">
              <Icon color={active ? '#e35914' : 'rgba(255,255,255,0.35)'} />
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
