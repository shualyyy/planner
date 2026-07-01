import { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format, parseISO } from 'date-fns'
import type { Task, Project, Habit, HabitLog } from '../services/supabase'
import { TASK_LABELS, TASK_PRIORITIES, parseLabelFromDescription, FREE_HABIT_LIMIT } from '../services/supabase'
import { useTaskStore } from '../store/taskStore'
import TaskDetailSheet from './TaskDetailSheet'
import PaywallSheet from './PaywallSheet'

const HABIT_COLORS = ['#D97757','#4A9EFF','#3DD68C','#A78BFA','#F5BDD0']
const HABIT_EMOJIS = ['⭕','🏃','📚','💧','🧘','💪','🥗','😴','✍️','🎯']
const WD_EN = ['Mo','Tu','We','Th','Fr','Sa','Su']

function startOfWeekMonday(d: Date): Date {
  const r = new Date(d)
  const dow = (r.getDay() + 6) % 7
  r.setDate(r.getDate() - dow)
  r.setHours(12, 0, 0, 0)
  return r
}

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
      <div style={{ ...base, background: '#D97757' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
    )
  }
  if (task.status === 'in_progress') return <div style={{ ...base, border: '2px solid #D97757', background: 'linear-gradient(90deg,#D97757 50%,transparent 50%)' }} />
  if (task.status === 'blocked')     return <div style={{ ...base, border: '2px solid #FF5C5C' }} />
  return <div style={{ ...base, border: '2px solid rgba(255,255,255,0.25)' }} />
}

/* ─── Task card ─── */
function TaskRow({ task, project, onToggle, onDelete, onEdit, onOpen }: {
  task: Task & { done: boolean }
  project?: Project
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
  onOpen?: () => void
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
        onClick={() => { if (swipeLocked) { resetSwipe(); return } if (onOpen) onOpen(); else onToggle() }}
        style={{
          display: 'flex', alignItems: 'center', gap: 13,
          padding: '14px 15px', background: '#242120',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14,
          transform: `translateX(${swipeX}px)`,
          transition: swipeLocked || swipeX === 0 ? 'transform 0.2s ease' : 'none',
          cursor: 'pointer',
        }}
      >
        <div onClick={e => { e.stopPropagation(); onToggle() }} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <StatusCircle task={task} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            font: '500 14px/1.2 var(--font-sans)', letterSpacing: '-0.005em',
            color: task.done ? 'rgba(255,255,255,0.3)' : '#F0ECE3',
            textDecoration: task.done ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{task.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
            {task.task_time && (
              <span style={{ background: near ? 'var(--accent-soft)' : '#2D2926', borderRadius: 6, padding: '3px 7px', font: '500 11px/1.2 var(--font-sans)', color: near ? '#D97757' : 'rgba(255,255,255,0.35)' }}>
                {task.task_time.slice(0,5)}
              </span>
            )}
            <span className="label-chip" style={{ background: chipColor + '1E', borderRadius: 6, padding: '3px 7px', font: '500 11px/1.2 var(--font-sans)', color: chipColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
              {chipName}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {task.priority === 'high' && (
            <span style={{ color: TASK_PRIORITIES.high.color, font: '700 13px/1.2 var(--font-sans)' }}>↑</span>
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
  const dragStartY = useRef(0)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  function onSheetDragStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }
  function onSheetDragMove(e: React.TouchEvent) {
    const dy = Math.max(0, e.touches[0].clientY - dragStartY.current)
    setDragY(dy)
  }
  function onSheetDragEnd() {
    setIsDragging(false)
    if (dragY > 100) { setDragY(0); onClose() }
    else setDragY(0)
  }
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
      <div
        onClick={e => e.stopPropagation()}
        onTouchStart={onSheetDragStart}
        onTouchMove={onSheetDragMove}
        onTouchEnd={onSheetDragEnd}
        style={{
          width: '100%', background: '#242120', borderRadius: '28px 28px 0 0', maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(255,255,255,0.08)',
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 38, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ font: '300 24px/1.2 var(--font-sans)', color: '#F0ECE3' }}>History</span>
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
                    <span style={{ font: '600 12px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.4)' }}>{format(parseISO(dk), 'EEEE, MMMM d')}</span>
                    <span style={{ font: '500 11px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.25)' }}>{dayTasks.filter(t => t.done).length}/{dayTasks.length} done</span>
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

/* ─── Habits inline (segment content) ─── */
function HabitsInline({ habits, habitLogs, todayKey, onToggle, onAdd, plan }: {
  habits: Habit[]
  habitLogs: HabitLog[]
  todayKey: string
  onToggle: (habitId: string, dk: string) => void
  onAdd: (h: Omit<Habit, 'id' | 'created_at'>) => Promise<void>
  plan: 'free' | 'pro'
}) {
  const [paywallOpen, setPaywallOpen] = useState(false)
  const habitsAtLimit = plan === 'free' && habits.length >= FREE_HABIT_LIMIT
  const today = new Date()
  const weekStart = startOfWeekMonday(today)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d
  })

  const isLogged = (habitId: string, dk: string) =>
    habitLogs.some(l => l.habit_id === habitId && l.completed_date === dk)

  const streak = (() => {
    if (habits.length === 0) return 0
    let s = 0
    const d = new Date(today)
    while (true) {
      const dk = dk_(d)
      const allDone = habits.every(h => habitLogs.some(l => l.habit_id === h.id && l.completed_date === dk))
      if (allDone) { s++; d.setDate(d.getDate() - 1) }
      else break
    }
    return s
  })()

  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`
  const doneThisMonth = habitLogs.filter(l => l.completed_date.startsWith(monthPrefix)).length
  const totalThisMonth = habits.length * today.getDate()

  function habitStreak(habitId: string): number {
    let s = 0
    const d = new Date(today)
    while (isLogged(habitId, dk_(d))) { s++; d.setDate(d.getDate() - 1) }
    return s
  }

  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(HABIT_COLORS[0])
  const [newEmoji, setNewEmoji] = useState('⭕')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showForm) setTimeout(() => inputRef.current?.focus(), 80)
  }, [showForm])

  async function handleSave() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await onAdd({ name: newName.trim(), icon: newEmoji, color: newColor, frequency: 'daily', time_of_day: 'morning' })
      setNewName(''); setNewColor(HABIT_COLORS[0]); setNewEmoji('⭕'); setShowForm(false)
    } catch (e) { console.error(e) }
    setAdding(false)
  }

  return (
    <div>
      {/* Best streak header */}
      {(() => {
        const bestStreak = habits.reduce((max, h) => Math.max(max, habitStreak(h.id)), 0)
        if (bestStreak < 3) return null
        return (
          <div style={{ font: '500 12px/1.2 var(--font-sans)', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            Best streak: <span style={{ color: bestStreak >= 7 ? '#E8A24A' : 'var(--text-2)', fontWeight: 700 }}>🔥 {bestStreak} day{bestStreak === 1 ? '' : 's'}</span>
          </div>
        )
      })()}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 9, marginBottom: 20 }}>
        {[
          { icon: '🔥', label: 'Streak', value: `${streak}d` },
          { icon: '✓',  label: 'Month',  value: `${doneThisMonth}/${totalThisMonth}` },
          { icon: '⚡', label: 'Active',  value: `${habits.length}` },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: '#2D2926', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '11px 12px' }}>
            <div style={{ fontSize: 15, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ font: '600 16px/1.2 var(--font-sans)', color: '#F0ECE3' }}>{s.value}</div>
            <div style={{ font: '500 10px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Habit cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habits.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.4)', font: '400 13px/1.2 var(--font-sans)' }}>
            No habits yet. Add your first one!
          </div>
        )}
        {habits.map(h => {
          const doneToday = isLogged(h.id, todayKey)
          const freqLabel = h.frequency === 'daily' ? 'Daily' : 'Weekly'
          const todLabel = h.time_of_day === 'morning' ? 'Morning' : h.time_of_day === 'evening' ? 'Evening' : 'Afternoon'
          return (
            <div key={h.id} style={{ background: '#2D2926', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, background: h.color + '26',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 18, lineHeight: 1,
                }}>
                  {h.icon && h.icon !== 'circle' ? h.icon : '⭕'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 15px/1.2 var(--font-sans)', color: '#F0ECE3', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                    {(() => {
                      const s = habitStreak(h.id)
                      if (s < 1) return null
                      if (s === 1) return <span style={{ font: '500 10.5px/1 var(--font-sans)', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>1 day</span>
                      const gold = s >= 7
                      return <span style={{ font: '600 11px/1 var(--font-sans)', color: gold ? '#E8A24A' : 'rgba(255,255,255,0.7)', flexShrink: 0 }}>🔥 {s}</span>
                    })()}
                  </div>
                  <div style={{ font: '400 11px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{freqLabel} · {todLabel}</div>
                </div>
                <button
                  onClick={() => onToggle(h.id, todayKey)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: doneToday ? h.color : 'transparent',
                    border: doneToday ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  {doneToday && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12.5l4 4L19 7" stroke="#1C1917" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingLeft: 46 }}>
                {weekDays.map((d, i) => {
                  const dk = dk_(d)
                  const done = isLogged(h.id, dk)
                  const isToday = dk === todayKey
                  const isFuture = dk > todayKey
                  const isMiss = !done && !isFuture && !isToday
                  let style: React.CSSProperties = { width: 15, height: 15, borderRadius: 999, flexShrink: 0 }
                  if (done) style = { ...style, background: h.color }
                  else if (isToday) style = { ...style, border: `1.5px solid ${h.color}`, boxShadow: `0 0 0 3px ${h.color}2E` }
                  else if (isMiss) style = { ...style, background: 'rgba(255,92,92,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }
                  else style = { ...style, border: '1.5px solid rgba(255,255,255,0.15)' }
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={style}>{isMiss && <span style={{ width: 5, height: 5, borderRadius: 999, background: '#FF5C5C' }} />}</div>
                      <span style={{ font: '500 8px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.25)' }}>{WD_EN[i]}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {showForm ? (
          <div style={{ background: '#2D2926', border: '1.5px solid rgba(217,119,87,0.3)', borderRadius: 16, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              ref={inputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowForm(false) }}
              placeholder="Habit name…"
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: '#F0ECE3', font: '500 15px/1.2 var(--font-sans)', width: '100%',
                borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 8,
              }}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {HABIT_EMOJIS.map(e => (
                <button key={e} onClick={() => setNewEmoji(e)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 16, lineHeight: 1,
                    background: newEmoji === e ? 'var(--accent-soft)' : 'rgba(255,255,255,0.06)',
                    outline: newEmoji === e ? `1.5px solid var(--accent)` : 'none',
                    outlineOffset: 1,
                    transition: 'background 0.12s, outline 0.12s',
                  }}
                >{e}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {HABIT_COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)}
                    style={{
                      width: 22, height: 22, borderRadius: '50%', border: 'none',
                      background: c, cursor: 'pointer', flexShrink: 0,
                      boxShadow: newColor === c ? `0 0 0 2px #242120, 0 0 0 4px ${c}` : 'none',
                      transform: newColor === c ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.12s, box-shadow 0.12s',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowForm(false); setNewName('') }}
                  style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', font: '500 12px/1.2 var(--font-sans)', border: 'none', cursor: 'pointer' }}
                >Cancel</button>
                <button onClick={handleSave} disabled={adding || !newName.trim()}
                  style={{
                    padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: newName.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                    color: newName.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                    font: '600 12px/1.2 var(--font-sans)', transition: 'all 0.15s',
                  }}
                >{adding ? '…' : 'Add'}</button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => habitsAtLimit ? setPaywallOpen(true) : setShowForm(true)}
            style={{
              height: 48, border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 14,
              background: 'transparent', color: 'rgba(255,255,255,0.6)', font: '500 13px/1.2 var(--font-sans)',
              cursor: 'pointer', marginTop: 4,
            }}
          >{habitsAtLimit ? '🔒 Upgrade for more habits' : '+ Add habit'}</button>
        )}
      </div>
      <PaywallSheet
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        headline="Free plan uses 5 habits"
        subhead="Upgrade to Pro for unlimited habits and Coop team features."
      />
    </div>
  )
}

const dk_ = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

/* ─── Coop task list (segment content) ─── */
function CoopTaskList({ tasks, projectMap, currentUserId, onToggle, onDelete, onEdit }: {
  tasks: Record<string, (Task & { done: boolean })[]>
  projectMap: Record<string, Project>
  currentUserId: string
  onToggle: (dk: string, id: string) => void
  onDelete: (dk: string, id: string) => void
  onEdit: (t: Task) => void
}) {
  const allFlat: { dk: string; t: Task & { done: boolean } }[] = []
  for (const dk of Object.keys(tasks)) {
    for (const t of tasks[dk] || []) allFlat.push({ dk, t })
  }
  const assignedToMe = allFlat.filter(x => x.t.assigned_to === currentUserId && !x.t.done)
  const assignedByMe = allFlat.filter(x => x.t.assigned_by === currentUserId)

  if (!allFlat.some(x => x.t.assigned_to === currentUserId || x.t.assigned_by === currentUserId)) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 12px', color: 'rgba(255,255,255,0.4)', font: '400 13px/1.5 var(--font-sans)' }}>
        No shared tasks yet. Get started by inviting someone to a project.
      </div>
    )
  }

  const Section = ({ label, items }: { label: string; items: typeof allFlat }) =>
    items.length === 0 ? null : (
      <div style={{ marginBottom: 24 }}>
        <div style={{ font: '600 10px/1.2 var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 11 }}>{label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(({ dk, t }) => (
            <TaskRow
              key={`coop-${t.id}-${dk}`}
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

  return (
    <>
      <Section label="Assigned to me" items={assignedToMe} />
      <Section label="Assigned by me" items={assignedByMe} />
    </>
  )
}

/* ─── Main ─── */
export default function TasksScreen({ tasks, onToggle, onDelete, onEdit }: TasksScreenProps) {
  const { projects, habits, habitLogs, toggleHabitLog, addHabit, profile } = useTaskStore()
  const today = new Date()
  const todayKey = dayKey(today)
  const tomorrowKey = dayKey(addDays(today, 1))
  const [showHistory, setShowHistory] = useState(false)
  const [segment, setSegment] = useState<'tasks' | 'habits' | 'coop'>('tasks')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [detailTask, setDetailTask] = useState<(Task & { done: boolean }) | null>(null)
  const [coopPaywallOpen, setCoopPaywallOpen] = useState(false)

  const projectMap = useMemo(() => {
    const m: Record<string, Project> = {}
    for (const p of projects) m[p.id] = p
    return m
  }, [projects])

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

  // Overdue: undone tasks from days before today, tagged with their original date
  const overdueTasks = historyDays.flatMap(dk =>
    (tasks[dk] || []).filter(t => !t.done).map(t => ({ ...t, task_date: dk }))
  )

  // Today progress
  const todayTasks = tasks[todayKey] || []
  const todayDone = todayTasks.filter(t => t.done).length
  const todayTotal = todayTasks.length

  // Search — flat filtered list across all dates
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const out: { dk: string; t: Task & { done: boolean } }[] = []
    for (const dk of Object.keys(tasks)) {
      for (const t of tasks[dk] || []) {
        if (t.title.toLowerCase().includes(q)) out.push({ dk, t })
      }
    }
    return out
  }, [tasks, searchQuery])

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 60)
  }, [searchOpen])

  function closeSearch() { setSearchOpen(false); setSearchQuery('') }

  function dayLabel(dk: string): string {
    if (dk === todayKey) return 'Today'
    if (dk === tomorrowKey) return 'Tomorrow'
    return format(parseISO(dk), 'EEEE')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ marginBottom: 18, padding: '8px 22px 0', flexShrink: 0 }}>
        {searchOpen ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 46, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '0 12px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') closeSearch() }}
              placeholder="Search tasks…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', font: '500 14px/1.2 var(--font-sans)' }}
            />
            <button onClick={closeSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        ) : (
          <>
            <div style={{ font: '600 11px/1.2 var(--font-sans)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Tasks</span>
              {segment === 'tasks' && (
                <button onClick={() => setSearchOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', display: 'flex' }} title="Search">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ font: '300 32px/1 var(--font-sans)', color: '#F0ECE3', letterSpacing: '-0.01em' }}>
                {format(today, 'EEEE')},<br />{format(today, 'd MMMM')}
              </div>
              {todayTotal > 0 && (
                <div style={{ textAlign: 'right', paddingBottom: 4 }}>
                  {todayDone === todayTotal ? (
                    <span style={{ font: '600 13px/1.2 var(--font-sans)', color: 'var(--success)' }}>All done ✓</span>
                  ) : (
                    <>
                      <span style={{ font: '700 26px/1 var(--font-sans)', color: 'var(--accent)' }}>{todayDone}</span>
                      <span style={{ font: '400 14px/1 var(--font-sans)', color: 'rgba(255,255,255,0.3)' }}>/{todayTotal}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Search results override — replaces segments while searching */}
      {searchOpen && searchQuery.trim() && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 22px', paddingBottom: 'calc(74px + env(safe-area-inset-bottom, 0px) + 8px)' }}>
          {searchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', font: '450 13.5px/1.2 var(--font-sans)' }}>
              No matches.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {searchResults.map(({ dk, t }) => (
                <TaskRow
                  key={`search-${t.id}-${dk}`}
                  task={t}
                  project={t.project_id ? projectMap[t.project_id] : undefined}
                  onToggle={() => onToggle(dk, t.id)}
                  onDelete={() => onDelete(dk, t.id)}
                  onEdit={() => onEdit(t)}
                  onOpen={() => setDetailTask(t)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Segment selector */}
      {!(searchOpen && searchQuery.trim()) && (<>
      <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 14, padding: 3, margin: '0 22px 18px', gap: 2 }}>
        {([
          { id: 'tasks',  label: 'Tasks'  },
          { id: 'habits', label: 'Habits' },
          { id: 'coop',   label: 'Coop'   },
        ] as const).map(s => (
          <button
            key={s.id}
            onClick={() => setSegment(s.id)}
            style={{
              flex: 1, height: 34, borderRadius: 11, border: 'none', cursor: 'pointer',
              font: '600 12px/1 var(--font-sans)', letterSpacing: '-0.01em',
              background: segment === s.id ? 'var(--accent)' : 'transparent',
              color: segment === s.id ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* History icon button — only in Tasks segment */}
      {segment === 'tasks' && historyCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 22px 8px', flexShrink: 0 }}>
          <button
            onClick={() => setShowHistory(true)}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
        </div>
      )}

      {/* Segment: Habits */}
      {segment === 'habits' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px', paddingBottom: 'calc(74px + env(safe-area-inset-bottom, 0px) + 8px)' }}>
          <HabitsInline
            habits={habits}
            habitLogs={habitLogs}
            todayKey={todayKey}
            onToggle={toggleHabitLog}
            onAdd={addHabit}
            plan={(profile?.plan ?? 'free') as 'free' | 'pro'}
          />
        </div>
      )}

      {/* Segment: Coop */}
      {segment === 'coop' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 22px', paddingBottom: 'calc(74px + env(safe-area-inset-bottom, 0px) + 8px)' }}>
          {(profile?.plan ?? 'free') === 'free' ? (
            <div style={{ padding: '40px 8px 20px', textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18, margin: '0 auto 16px',
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>🔒</div>
              <div style={{ font: '300 22px/1.2 var(--font-sans)', color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 8 }}>
                Coop is a Pro feature
              </div>
              <div style={{ font: '400 13.5px/1.5 var(--font-sans)', color: 'var(--text-muted)', marginBottom: 22, maxWidth: 300, marginInline: 'auto' }}>
                Invite teammates by Planer ID, assign tasks, and track progress together.
              </div>
              <button
                onClick={() => setCoopPaywallOpen(true)}
                style={{
                  padding: '12px 24px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: 'var(--accent)', color: '#fff',
                  font: '600 13px/1 var(--font-sans)', letterSpacing: '-0.01em',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 6px 18px var(--accent-glow)',
                }}
              >Upgrade to Pro</button>
              <PaywallSheet
                open={coopPaywallOpen}
                onClose={() => setCoopPaywallOpen(false)}
                headline="Unlock Coop"
                subhead="Team up on shared projects with role-based access."
              />
            </div>
          ) : (
            <CoopTaskList
              tasks={tasks}
              projectMap={projectMap}
              currentUserId={profile?.id ?? ''}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          )}
        </div>
      )}

      {/* Segment: Tasks */}
      {segment === 'tasks' && (
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 22px', paddingBottom: 'calc(74px + env(safe-area-inset-bottom, 0px) + 8px)' }}>
        {activeDays.length === 0 && overdueTasks.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
            <span style={{ font: '450 13.5px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.4)' }}>Nothing scheduled. Enjoy the quiet.</span>
          </div>
        ) : (
          <>
          {overdueTasks.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                font: '600 10px/1.2 var(--font-sans)', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--danger)', marginBottom: 11,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
                Overdue
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {overdueTasks.map(t => (
                  <TaskRow
                    key={`overdue-${t.id}`}
                    task={t}
                    project={t.project_id ? projectMap[t.project_id] : undefined}
                    onToggle={() => onToggle(t.task_date, t.id)}
                    onDelete={() => onDelete(t.task_date, t.id)}
                    onEdit={() => onEdit(t)}
                    onOpen={() => setDetailTask(t)}
                  />
                ))}
              </div>
            </div>
          )}
          {activeDays.map(dk => {
            const dayTasks = tasks[dk]
            if (!dayTasks.length) return null
            const isTomorrowOrLater = dk !== todayKey
            return (
              <div key={dk} style={{ marginBottom: 24 }}>
                <div style={{ font: '600 10px/1.2 var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: isTomorrowOrLater ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.35)', marginBottom: 11 }}>
                  {dayLabel(dk)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: isTomorrowOrLater ? 0.75 : 1 }}>
                  {dayTasks.map(t => (
                    <TaskRow
                      key={`${t.id}-${dk}`}
                      task={t}
                      project={t.project_id ? projectMap[t.project_id] : undefined}
                      onToggle={() => onToggle(dk, t.id)}
                      onDelete={() => onDelete(dk, t.id)}
                      onEdit={() => onEdit(t)}
                      onOpen={() => setDetailTask(t)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
          </>
        )}
      </div>
      )}
      </>)}

      <TaskDetailSheet
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onEdit={onEdit}
        onDelete={(t) => onDelete(t.task_date, t.id)}
      />

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
    </div>
  )
}
