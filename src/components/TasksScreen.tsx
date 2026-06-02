import { useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { format, parseISO } from 'date-fns'
import type { Task } from '../services/supabase'
import { TASK_LABELS, parseLabelFromDescription } from '../services/supabase'

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

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function isNear(task: Task): boolean {
  if (!task.task_time) return false
  const now = new Date()
  const todayStr = dayKey(now)
  if (task.task_date !== todayStr) return false
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

/* ─── TaskRow ─── */
function TaskRow({ task, dateKey, onToggle, onDelete, onEdit }: {
  task: Task & { done: boolean }
  dateKey: string
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  const [swipeX, setSwipeX] = useState(0)
  const [swipeLocked, setSwipeLocked] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [popped, setPopped] = useState(false)
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

  function handleToggle() {
    if (!task.done) { setPopped(true); setTimeout(() => setPopped(false), 350) }
    onToggle()
  }

  const label = parseLabelFromDescription(task.description)
  const lc = TASK_LABELS[label].color
  const near = isNear(task)

  void dateKey

  return (
    <div style={{ position: 'relative', overflow: 'hidden', opacity: deleting ? 0 : 1, maxHeight: deleting ? 0 : '200px', transition: 'opacity 0.2s, max-height 0.2s' }}>
      {/* Action zone */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '128px', display: 'flex' }}>
        <div style={{ width: '64px', background: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => { resetSwipe(); onEdit() }} style={{ color: '#fff', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PencilIcon /></button>
        </div>
        <div style={{ width: '64px', background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => { setDeleting(true); setTimeout(onDelete, 200) }} style={{ color: '#fff', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon /></button>
        </div>
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onClick={() => { if (swipeLocked) { resetSwipe(); return } handleToggle() }}
        style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '16px 18px', background: 'var(--surface)',
          transform: `translateX(${swipeX}px)`,
          transition: swipeLocked || swipeX === 0 ? 'transform 0.2s ease' : 'none',
          cursor: 'pointer',
        }}
      >
        {/* Checkbox */}
        <div style={{
          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
          border: task.done ? 'none' : '1.5px solid var(--border)',
          background: task.done ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: task.done ? '0 0 0 4px var(--accent-soft)' : 'none',
          transition: 'all 0.15s',
          animation: popped ? 'pop 0.3s cubic-bezier(0.4,0,0.2,1)' : 'none',
        }}>
          {task.done && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '14.5px', fontWeight: 500, letterSpacing: '-0.005em',
            color: task.done ? 'var(--text-muted)' : 'var(--text)',
            textDecoration: task.done ? 'line-through' : 'none',
            textDecorationThickness: '1.2px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{task.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: lc, flexShrink: 0 }} />
            <span style={{ fontSize: '11.5px', fontWeight: 450, color: 'var(--text-muted)' }}>{TASK_LABELS[label].name}</span>
            {task.is_all_day && <><span style={{ color: 'var(--text-faint)' }}>·</span><span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>All day</span></>}
          </div>
        </div>

        {/* Time chip */}
        {task.task_time && (
          <span style={{
            fontSize: '11.5px', fontWeight: 550, padding: '4px 9px', borderRadius: '999px', flexShrink: 0,
            background: near ? 'var(--accent-soft)' : 'var(--surface2)',
            color: near ? 'var(--accent-2)' : 'var(--text-2)',
          }}>{task.task_time.slice(0,5)}</span>
        )}
      </div>
    </div>
  )
}

/* ─── History sheet ─── */
function HistorySheet({ tasks, historyDays, todayKey, onToggle, onDelete, onEdit, onClose }: {
  tasks: Record<string, (Task & { done: boolean })[]>
  historyDays: string[]
  todayKey: string
  onToggle: (dk: string, id: string) => void
  onDelete: (dk: string, id: string) => void
  onEdit: (t: Task) => void
  onClose: () => void
}) {
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', borderRadius: '28px 28px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--sheet-shadow)' }}>
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border)', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>История задач</span>
            <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Закрыть</button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 20px 32px', flex: 1 }}>
          {historyDays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '13px' }}>История пуста</div>
          ) : (
            [...historyDays].reverse().map(dk => {
              const dayTasks = tasks[dk] || []
              if (!dayTasks.length) return null
              return (
                <div key={dk} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 2px 8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>{format(parseISO(dk), 'EEEE, MMMM d')}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{dayTasks.filter(t => t.done).length}/{dayTasks.length} done</span>
                  </div>
                  <div style={{ background: 'var(--surface)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
                    {dayTasks.map((t, idx) => (
                      <div key={t.id}>
                        {idx > 0 && <div style={{ borderTop: '1px solid var(--hairline)' }} />}
                        <TaskRow task={t} dateKey={dk} onToggle={() => onToggle(dk, t.id)} onDelete={() => onDelete(dk, t.id)} onEdit={() => onEdit(t)} />
                      </div>
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
  const todayKey = dayKey(new Date())
  const tomorrowKey = dayKey(addDays(new Date(), 1))
  const [showHistory, setShowHistory] = useState(false)

  const { totalToday, doneToday } = useMemo(() => {
    const t = tasks[todayKey] || []
    return { totalToday: t.length, doneToday: t.filter(x => x.done).length }
  }, [tasks, todayKey])

  // Pinned goals: tasks with is_pinned=true and pin_end >= today
  const pinnedTasks = useMemo(() => {
    const all = Object.values(tasks).flat()
    const seen = new Set<string>()
    return all.filter(t => {
      if (!t.is_pinned || seen.has(t.id)) return false
      seen.add(t.id)
      return !t.pin_end || t.pin_end >= todayKey
    })
  }, [tasks, todayKey])

  // Active: today + future only
  // History: all past days (both done and undone)
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
  const pct = totalToday > 0 ? Math.round(doneToday / totalToday * 100) : 0
  const greeting = getGreeting()

  function dayLabel(dk: string): string {
    if (dk === todayKey) return 'Today'
    if (dk === tomorrowKey) return 'Tomorrow'
    return format(parseISO(dk), 'EEEE')
  }
  function dayMeta(dk: string): string { return format(parseISO(dk), 'MMMM d') }

  function renderDayGroup(dk: string) {
    const dayTasks = tasks[dk] || []
    if (!dayTasks.length) return null
    return (
      <div key={dk} style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 2px 8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{dayLabel(dk)}</span>
          <span style={{ fontSize: '12px', fontWeight: 450, color: 'var(--text-muted)' }}>{dayMeta(dk)}</span>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
          {dayTasks.map((t, idx) => (
            <div key={t.id}>
              {idx > 0 && <div style={{ borderTop: '1px solid var(--hairline)' }} />}
              <TaskRow task={t} dateKey={dk} onToggle={() => onToggle(dk, t.id)} onDelete={() => onDelete(dk, t.id)} onEdit={() => onEdit(t)} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Hero */}
      <div style={{ padding: '6px 24px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--accent)' }}>{greeting}</div>
          {historyCount > 0 && (
            <button onClick={() => setShowHistory(true)} style={{
              display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px',
              borderRadius: '999px', background: 'var(--surface)', boxShadow: 'var(--card-shadow)',
              fontSize: '12px', fontWeight: 550, color: 'var(--text-2)', fontFamily: 'inherit',
            }}>
              🗂 История · {historyCount}
            </button>
          )}
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '44px', lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '16px' }}>
          {totalToday === 0
            ? <>Let's plan <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>today</em></>
            : doneToday === totalToday
              ? <><em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>All done.</em></>
              : <>{totalToday - doneToday} left for <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>today</em></>
          }
        </h1>
        {totalToday > 0 && (
          <>
            <div style={{ height: '6px', background: 'var(--surface)', borderRadius: '999px', overflow: 'hidden', boxShadow: 'var(--card-shadow)', marginBottom: '6px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent-2), var(--accent))', borderRadius: '999px', transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 450, color: 'var(--text-2)' }}>
              <b style={{ color: 'var(--text)', fontWeight: 600 }}>{doneToday}</b> of <b style={{ color: 'var(--text)', fontWeight: 600 }}>{totalToday}</b> done · {pct}%
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px', paddingBottom: '90px' }}>

        {/* Pinned goals */}
        {pinnedTasks.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', padding: '0 2px 8px' }}>📌 Главное</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pinnedTasks.map(t => {
                const label = parseLabelFromDescription(t.description)
                const lc = TASK_LABELS[label].color
                const daysLeft = t.pin_end ? Math.ceil((new Date(t.pin_end).getTime() - Date.now()) / 86400000) : null
                return (
                  <div key={t.id} style={{ background: 'var(--surface)', borderRadius: '16px', padding: '14px 16px', boxShadow: 'var(--card-shadow)', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `3px solid ${lc}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', textDecoration: t.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                      {daysLeft !== null && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{daysLeft > 0 ? `${daysLeft} дн. осталось` : 'Срок истёк'}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeDays.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 450, color: 'var(--text-muted)' }}>Nothing scheduled. Enjoy the quiet.</span>
          </div>
        ) : (
          activeDays.map(dk => renderDayGroup(dk))
        )}
      </div>

      {showHistory && (
        <HistorySheet
          tasks={tasks}
          historyDays={historyDays}
          todayKey={todayKey}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}
