import { useState, useRef } from 'react'
import { format, isSameDay } from 'date-fns'
import { useTaskStore } from '../store/taskStore'
import AddTaskModal from './AddTaskModal'
import type { Task } from '../services/supabase'

/* ─── Icons ───────────────────────────────────────────────── */

const ClockIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
)

const EmptyIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
)

const CheckIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
)

/* ─── TaskRow ─────────────────────────────────────────────── */

interface TaskRowProps {
  task: Task
  idx: number
  done: boolean
  isMobile: boolean
  onToggle: () => void
  onDelete: () => Promise<void>
}

function TaskRow({ task, idx, done, isMobile, onToggle, onDelete }: TaskRowProps) {
  const [hovered, setHovered]       = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [swipeX, setSwipeX]         = useState(0)
  const [swipeLocked, setSwipeLocked] = useState(false)
  const touchStartX = useRef(0)

  const SWIPE_THRESHOLD = 60
  const SWIPE_LOCK_X   = -72

  async function triggerDelete() {
    setDeleting(true)
    await new Promise(r => setTimeout(r, 200))
    await onDelete()
  }

  /* Touch handlers (mobile) */
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchMove(e: React.TouchEvent) {
    if (swipeLocked) return
    const dx = e.touches[0].clientX - touchStartX.current
    if (dx < 0) setSwipeX(Math.max(dx, SWIPE_LOCK_X - 8))
  }

  function onTouchEnd() {
    if (swipeLocked) return
    if (swipeX < -SWIPE_THRESHOLD) {
      setSwipeX(SWIPE_LOCK_X)
      setSwipeLocked(true)
    } else {
      setSwipeX(0)
    }
  }

  function resetSwipe() {
    setSwipeX(0)
    setSwipeLocked(false)
    setConfirming(false)
  }

  /* Inline confirm UI (desktop) */
  if (confirming) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 10px', borderRadius: '9px',
        background: 'rgba(239,68,68,0.07)',
        borderTop: idx > 0 ? '1px solid var(--border-soft)' : 'none',
        opacity: deleting ? 0 : 1,
        maxHeight: deleting ? 0 : '80px',
        overflow: 'hidden',
        transition: 'opacity 0.2s, max-height 0.2s',
      }}>
        <span style={{ fontSize: '12.5px', color: 'var(--text-2)' }}>Delete «{task.title}»?</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setConfirming(false)}
            style={{
              fontSize: '12px', padding: '4px 10px', borderRadius: '7px',
              background: 'var(--panel-2)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >No</button>
          <button
            onClick={triggerDelete}
            style={{
              fontSize: '12px', padding: '4px 10px', borderRadius: '7px',
              background: '#ef4444', border: 'none',
              color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
            }}
          >Yes</button>
        </div>
      </div>
    )
  }

  /* Mobile swipe row */
  if (isMobile) {
    return (
      <div
        style={{
          position: 'relative', overflow: 'hidden',
          borderTop: idx > 0 ? '1px solid var(--border-soft)' : 'none',
          borderRadius: '9px',
          opacity: deleting ? 0 : 1,
          maxHeight: deleting ? 0 : '200px',
          transition: 'opacity 0.2s, max-height 0.2s',
        }}
      >
        {/* Red delete zone behind the row */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: `${Math.abs(SWIPE_LOCK_X)}px`,
          background: '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {swipeLocked ? (
            confirming ? (
              /* Inline confirm on mobile */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={triggerDelete}
                  style={{
                    fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                    background: '#fff', border: 'none', color: '#ef4444',
                    cursor: 'pointer', fontWeight: 600,
                  }}
                >Delete</button>
                <button
                  onClick={resetSwipe}
                  style={{
                    fontSize: '10px', padding: '2px 6px', borderRadius: '5px',
                    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)',
                    cursor: 'pointer',
                  }}
                >Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}
              >
                <TrashIcon />
              </button>
            )
          ) : (
            <TrashIcon />
          )}
        </div>

        {/* Swipeable task content */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={() => { if (swipeLocked) { resetSwipe(); return } onToggle() }}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '11px',
            padding: '12px 10px',
            background: 'var(--panel)',
            transform: `translateX(${swipeX}px)`,
            transition: swipeLocked || swipeX === 0 ? 'transform 0.2s ease' : 'none',
            cursor: 'pointer',
          }}
        >
          <TaskContent task={task} done={done} />
        </div>
      </div>
    )
  }

  /* Desktop row */
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false) }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '11px',
        padding: '12px 10px', borderRadius: '9px',
        cursor: 'pointer', transition: 'background 0.15s, opacity 0.2s, max-height 0.2s',
        borderTop: idx > 0 ? '1px solid var(--border-soft)' : 'none',
        background: hovered ? '#1a1a1a' : 'transparent',
        opacity: deleting ? 0 : 1,
        maxHeight: deleting ? 0 : '200px',
        overflow: 'hidden',
      }}
      onClick={() => onToggle()}
    >
      <TaskContent task={task} done={done} />

      {/* Trash button — desktop only */}
      <button
        onClick={e => { e.stopPropagation(); setConfirming(true) }}
        title="Delete task"
        style={{
          flexShrink: 0, background: 'none', border: 'none',
          cursor: 'pointer', padding: '2px 4px',
          color: 'var(--text-muted)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s, color 0.15s',
          marginTop: '1px',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
      >
        <TrashIcon />
      </button>
    </div>
  )
}

/* Shared task body content */
function TaskContent({ task, done }: { task: Task; done: boolean }) {
  return (
    <>
      {/* Checkbox */}
      <div style={{
        width: '16px', height: '16px', borderRadius: '5px',
        border: done ? 'none' : '1.5px solid #3a3a3a',
        flexShrink: 0, marginTop: '2px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? 'var(--accent)' : 'transparent',
        transition: 'all 0.15s',
      }}>
        {done && <CheckIcon />}
      </div>

      {/* Task body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px', fontWeight: 450, lineHeight: 1.4,
          letterSpacing: '-0.005em',
          color: done ? 'var(--text-muted)' : 'var(--text)',
          textDecoration: done ? 'line-through' : 'none',
          textDecorationColor: 'var(--text-faint)',
          transition: 'all 0.2s',
        }}>
          {task.title}
        </div>
        {task.task_time && (
          <div style={{ marginTop: '5px' }}>
            <span style={{
              fontSize: '10.5px', padding: '2px 7px', borderRadius: '5px',
              background: 'var(--accent-soft)', color: '#f0b899',
              display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500,
            }}>
              <ClockIcon />{task.task_time.slice(0, 5)}
            </span>
          </div>
        )}
        {task.description && (
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
            {task.description}
          </div>
        )}
      </div>
    </>
  )
}

/* ─── TodayTasks ──────────────────────────────────────────── */

interface TodayTasksProps {
  selectedDate: Date
}

export default function TodayTasks({ selectedDate }: TodayTasksProps) {
  const { tasks, donIds, toggleDone, deleteTask } = useTaskStore()
  const [modalOpen, setModalOpen] = useState(false)
  const today = new Date()
  const isToday = isSameDay(selectedDate, today)
  const isMobile = window.innerWidth < 768

  const dateKey = format(selectedDate, 'yyyy-MM-dd')
  const dayTasks = tasks.filter(t => t.task_date === dateKey)
  const completed = dayTasks.filter(t => donIds.has(t.id)).length
  const pct = dayTasks.length ? (completed / dayTasks.length) * 100 : 0

  const headerLabel = isToday ? 'Today' : format(selectedDate, 'EEEE')
  const subLabel = format(selectedDate, isToday ? 'EEEE, MMMM d, yyyy' : 'MMMM d, yyyy')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--panel)', flex: 1, minHeight: 0, position: 'relative' }}>

      {/* Header */}
      <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid var(--border-soft)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {headerLabel}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {dayTasks.length > 0 && (
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {completed}/{dayTasks.length}
              </span>
            )}
            {!isMobile && (
              <button
                onClick={() => setModalOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '12px', fontWeight: 500, padding: '5px 10px',
                  borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'var(--panel-2)', color: 'var(--text-2)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--accent-2)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
                }}
              >
                <span style={{ fontSize: '15px', lineHeight: 1 }}>+</span> Add task
              </button>
            )}
          </div>
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{subLabel}</div>

        {dayTasks.length > 0 && (
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '4px', background: '#1f1f1f', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                borderRadius: '2px', transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)', fontWeight: 500 }}>{Math.round(pct)}%</div>
          </div>
        )}
      </div>

      {/* Content */}
      {dayTasks.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px', textAlign: 'center', gap: '14px',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(180deg, #1c1c1c, #161616)',
            border: '1px solid #262626',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)',
          }}>
            <EmptyIcon />
          </div>
          <div style={{ fontSize: '13.5px', color: 'var(--text)', fontWeight: 500 }}>
            No tasks {isToday ? 'today' : 'this day'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px', lineHeight: 1.5 }}>
            Tell the AI assistant what to add to your calendar.
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px 16px' }}>
          {dayTasks.map((t, idx) => (
            <TaskRow
              key={t.id}
              task={t}
              idx={idx}
              done={donIds.has(t.id)}
              isMobile={isMobile}
              onToggle={() => toggleDone(t.id)}
              onDelete={() => deleteTask(t.id)}
            />
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <button
          onClick={() => setModalOpen(true)}
          style={{
            position: 'absolute', bottom: '24px', right: '20px',
            width: '52px', height: '52px', borderRadius: '50%', border: 'none',
            background: 'var(--accent)',
            boxShadow: '0 0 0 1px rgba(217,119,87,0.3), 0 0 24px rgba(217,119,87,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '24px', color: '#fff',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
        >
          +
        </button>
      )}

      <AddTaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDate={selectedDate}
      />
    </div>
  )
}
