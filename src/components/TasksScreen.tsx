import { useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { format, parseISO } from 'date-fns'
import type { Task, Project } from '../services/supabase'
import { TASK_LABELS, TASK_PRIORITIES, parseLabelFromDescription } from '../services/supabase'
import { useTaskStore } from '../store/taskStore'
import HabitsSheet from './HabitsSheet'

interface TasksScreenProps {
  tasks: Record<string, (Task & { done: boolean })[]>
  onToggle: (dateKey: string, taskId: string) => void
  onDelete: (dateKey: string, taskId: string) => void
  onEdit: (task: Task) => void
}

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function isNear(task: Task): boolean {
  if (!task.task_time) return false
  const now = new Date()
  if (task.task_date !== dayKey(now)) return false
  const [hh, mm] = task.task_time.split(':').map(Number)
  const diff = hh * 60 + mm - (now.getHours() * 60 + now.getMinutes())
  return diff >= 0 && diff <= 90
}

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
)
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

/* ─── Status circle ─── */
function StatusCircle({ task }: { task: Task & { done: boolean } }) {
  const base: React.CSSProperties = { width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }
  if (task.done) {
    return (
      <div style={{ ...base, background: '#e35914' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
    )
  }
  if (task.status === 'in_progress') return <div style={{ ...base, border: '2px solid #e35914', background: 'linear-gradient(90deg,#e35914 50%,transparent 50%)' }} />
  if (task.status === 'blocked')     return <div style={{ ...base, border: '2px solid #FF5C5C' }} />
  return <div style={{ ...base, border: '2px solid rgba(255,255,255,0.25)' }} />
}

/* ─── Task card ─── */
function TaskRow({ task, project, onToggle, onDelete, onEdit }: {
  task: Task & { done: boolean }
  project?: Project
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  const [swipeX, setSwipeX] = useState(0)
  const [swipeLocked, setSwipeLocked] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const touchStartX = useRef(0)
  const SWIPE_THRESHOLD = 50
  const SWIPE_LOCK_X = -128

  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function onTouchMove(e: React.TouchEvent) {
    if (swipeLocked) return
    const dx = e.touches[0].clientX - touchStartX.current
    if (dx < 0) setSwipeX(Math.max(dx, SWIPE_LOCK_X - 8))
  }
  function onTouchEnd() {
    if (swipeLocked) return
    if (swipeX < -SWIPE_THRESHOLD) { setSwipeX(SWIPE_LOCK_X); setSwipeLocked(true) }
    else setSwipeX(0)
  }
  function resetSwipe() { setSwipeX(0); setSwipeLocked(false) }

  const label = parseLabelFromDescription(task.description)
  const chipColor = project ? project.color : TASK_LABELS[label].color
  const chipName = project ? project.name : TASK_LABELS[label].name
  const near = isNear(task)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 14, opacity: deleting ? 0 : 1, maxHeight: deleting ? 0 : 200, transition: 'opacity 0.2s, max-height 0.2s' }}>
      {/* Action zone */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 128, display: 'flex' }}>
        <div style={{ width: 64, background: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => { resetSwipe(); onEdit() }} style={{ color: '#fff', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PencilIcon /></button>
        </div>
        <div style={{ width: 64, background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => { setDeleting(true); setTimeout(onDelete, 200) }} style={{ color: '#fff', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon /></button>
        </div>
      </div>

      {/* Card */}
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onClick={() => { if (swipeLocked) { resetSwipe(); return } onToggle() }}
        style={{
          display: 'flex', alignItems: 'center', gap: 13,
          padding: '14px 15px', background: '#111118',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14,
          transform: `translateX(${swipeX}px)`,
          transition: swipeLocked || swipeX === 0 ? 'transform 0.2s ease' : 'none',
          cursor: 'pointer',
        }}
      >
        <StatusCircle task={task} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            font: '500 14px Inter', letterSpacing: '-0.005em',
            color: task.done ? 'rgba(255,255,255,0.3)' : '#F0ECE3',
            textDecoration: task.done ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{task.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
            {task.task_time && (
              <span style={{ background: near ? 'var(--accent-soft)' : '#16161E', borderRadius: 6, padding: '3px 7px', font: '500 11px Inter', color: near ? '#e35914' : 'rgba(255,255,255,0.35)' }}>
                {task.task_time.slice(0,5)}
              </span>
            )}
            <span className="label-chip" style={{ background: chipColor + '1E', borderRadius: 6, padding: '3px 7px', font: '500 11px Inter', color: chipColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
              {chipName}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {task.priority === 'high' && (
            <span style={{ color: TASK_PRIORITIES.high.color, font: '700 13px Inter' }}>↑</span>
          )}
          <span className="color-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: chipColor }} />
        </div>
      </div>
    </div>
  )
}

/* ─── History sheet ─── */
function HistorySheet({ tasks, historyDays, projectMap, onToggle, onDelete, onEdit, onClose }: {
  tasks: Record<string, (Task & { done: boolean })[]>
  historyDays: string[]
  projectMap: Record<string, Project>
  onToggle: (dk: string, id: string) => void
  onDelete: (dk: string, id: string) => void
  onEdit: (t: Task) => void
  onClose: () => void
}) {
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: '#111118', borderRadius: '28px 28px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 38, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ font: '300 24px Inter', color: '#F0ECE3' }}>History</span>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Close</button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 20px 32px', flex: 1 }}>
          {historyDays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No history yet</div>
          ) : (
            [...historyDays].reverse().map(dk => {
              const dayTasks = tasks[dk] || []
              if (!dayTasks.length) return null
              return (
                <div key={dk} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 2px 8px' }}>
                    <span style={{ font: '600 12px Inter', color: 'rgba(255,255,255,0.4)' }}>{format(parseISO(dk), 'EEEE, MMMM d')}</span>
                    <span style={{ font: '500 11px Inter', color: 'rgba(255,255,255,0.25)' }}>{dayTasks.filter(t => t.done).length}/{dayTasks.length} done</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dayTasks.map(t => (
                      <TaskRow key={`${t.id}-${dk}`} task={t} project={t.project_id ? projectMap[t.project_id] : undefined} onToggle={() => onToggle(dk, t.id)} onDelete={() => onDelete(dk, t.id)} onEdit={() => onEdit(t)} />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── Main ─── */
export default function TasksScreen({ tasks, onToggle, onDelete, onEdit }: TasksScreenProps) {
  const { projects, habits, habitLogs, toggleHabitLog } = useTaskStore()
  const today = new Date()
  const todayKey = dayKey(today)
  const tomorrowKey = dayKey(addDays(today, 1))
  const [showHistory, setShowHistory] = useState(false)
  const [showHabits, setShowHabits] = useState(false)

  const projectMap = useMemo(() => {
    const m: Record<string, Project> = {}
    for (const p of projects) m[p.id] = p
    return m
  }, [projects])

  const habitsDone = habits.filter(h => habitLogs.some(l => l.habit_id === h.id && l.completed_date === todayKey)).length

  const { activeDays, historyDays } = useMemo(() => {
    const sorted = Object.keys(tasks).sort()
    const active: string[] = []
    const history: string[] = []
    for (const dk of sorted) {
      if (!(tasks[dk] || []).length) continue
      if (dk >= todayKey) active.push(dk)
      else history.push(dk)
    }
    return { activeDays: active, historyDays: history }
  }, [tasks, todayKey])

  const historyCount = historyDays.reduce((s, dk) => s + (tasks[dk]?.length ?? 0), 0)

  function dayLabel(dk: string): string {
    if (dk === todayKey) return 'Today'
    if (dk === tomorrowKey) return 'Tomorrow'
    return format(parseISO(dk), 'EEEE')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ marginBottom: 18, padding: '8px 22px 0', flexShrink: 0 }}>
        <div style={{ font: '600 11px Inter', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Tasks</div>
        <div style={{ font: '300 32px/1 Inter', color: '#F0ECE3', letterSpacing: '-0.01em' }}>{format(today, 'EEEE')},<br/>{format(today, 'd MMMM')}</div>
      </div>

      {/* Habits strip — always visible so user can open sheet even with 0 habits */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: habits.length > 0 ? 10 : 14, padding: '0 22px' }}>
          <button onClick={() => setShowHabits(true)} style={{ font: '500 11px Inter', color: '#e35914', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
            {habits.length > 0
              ? <>Habits · {habitsDone}/{habits.length} <span style={{ fontSize: 13 }}>→</span></>
              : <>Habits <span style={{ fontSize: 13 }}>→</span></>
            }
          </button>
        </div>
        {habits.length > 0 && (
          <div style={{ display: 'flex', gap: 9, overflowX: 'auto', marginBottom: 22, padding: '0 22px 2px' }}>
            {habits.map(h => {
              const done = habitLogs.some(l => l.habit_id === h.id && l.completed_date === todayKey)
              return (
                <button key={h.id} onClick={() => toggleHabitLog(h.id, todayKey)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 13px', background: '#16161E', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, flexShrink: 0, cursor: 'pointer' }}>
                  <span style={{ font: '500 12px Inter', color: '#F0ECE3' }}>{h.name}</span>
                  {done
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#3DD68C"/><path d="M8 12.5l2.5 2.5L16 9" stroke="#0A0A0F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <span style={{ width: 16, height: 16, borderRadius: 999, border: '1.5px solid rgba(255,255,255,0.25)' }} />
                  }
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* History icon button */}
      {historyCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 22px 8px', flexShrink: 0 }}>
          <button
            onClick={() => setShowHistory(true)}
            title={`History (${historyCount})`}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#16161E', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.55)', cursor: 'pointer', flexShrink: 0,
              position: 'relative',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {historyCount > 0 && (
              <span style={{
                position: 'absolute', top: -3, right: -3,
                minWidth: 14, height: 14, borderRadius: 999,
                background: 'var(--accent)', color: '#fff',
                fontSize: '8.5px', fontWeight: 700, display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: '0 3px',
              }}>{historyCount > 9 ? '9+' : historyCount}</span>
            )}
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 22px', paddingBottom: 'calc(74px + env(safe-area-inset-bottom, 0px) + 8px)' }}>
        {activeDays.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
            <span style={{ font: '450 13.5px Inter', color: 'rgba(255,255,255,0.4)' }}>Nothing scheduled. Enjoy the quiet.</span>
          </div>
        ) : (
          activeDays.map(dk => {
            const dayTasks = tasks[dk]
            if (!dayTasks.length) return null
            const isTomorrowOrLater = dk !== todayKey
            return (
              <div key={dk} style={{ marginBottom: 24 }}>
                <div style={{ font: '600 10px Inter', letterSpacing: '0.1em', textTransform: 'uppercase', color: isTomorrowOrLater ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.35)', marginBottom: 11 }}>
                  {dayLabel(dk)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: isTomorrowOrLater ? 0.55 : 1 }}>
                  {dayTasks.map(t => (
                    <TaskRow
                      key={`${t.id}-${dk}`}
                      task={t}
                      project={t.project_id ? projectMap[t.project_id] : undefined}
                      onToggle={() => onToggle(dk, t.id)}
                      onDelete={() => onDelete(dk, t.id)}
                      onEdit={() => onEdit(t)}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {showHistory && (
        <HistorySheet
          tasks={tasks}
          historyDays={historyDays}
          projectMap={projectMap}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
          onClose={() => setShowHistory(false)}
        />
      )}

      {showHabits && (
        <HabitsSheet
          habits={habits}
          habitLogs={habitLogs}
          onToggle={toggleHabitLog}
          onClose={() => setShowHabits(false)}
        />
      )}
    </div>
  )
}
