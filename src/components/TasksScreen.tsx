import { useState, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import type { Task } from '../services/supabase'
import { CheckIcon } from './icons'

interface TasksScreenProps {
  tasks: Record<string, (Task & { done: boolean })[]>
  onToggle: (dateKey: string, taskId: string) => void
  onDelete: (dateKey: string, taskId: string) => void
  onEdit: (task: Task) => void
  onAdd: () => void
}

/* ─── Icons ─── */
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
function TaskRow({ task, onToggle, onDelete, onEdit }: {
  task: Task & { done: boolean }
  dateKey: string
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
  }

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: '10px',
      opacity: deleting ? 0 : 1, maxHeight: deleting ? 0 : '200px',
      transition: 'opacity 0.2s, max-height 0.2s',
    }}>
      {/* Action zone */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '128px', display: 'flex' }}>
        <div style={{ width: '64px', background: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => { resetSwipe(); onEdit() }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
            <PencilIcon />
          </button>
        </div>
        <div style={{ width: '64px', background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => { setDeleting(true); setTimeout(() => onDelete(), 200) }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (swipeLocked) { resetSwipe(); return } onToggle() }}
        onContextMenu={e => { e.preventDefault(); if (swipeLocked) resetSwipe(); else { setSwipeX(SWIPE_LOCK_X); setSwipeLocked(true) } }}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 14px', background: 'var(--surface)',
          transform: `translateX(${swipeX}px)`,
          transition: swipeLocked || swipeX === 0 ? 'transform 0.2s ease' : 'none',
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Checkbox */}
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
          border: task.done ? 'none' : '1.5px solid var(--border)',
          background: task.done ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {task.done && <CheckIcon />}
        </div>

        {/* Title */}
        <div style={{
          flex: 1, fontSize: '13px', fontWeight: 450,
          color: task.done ? 'var(--text-muted)' : 'var(--text)',
          textDecoration: task.done ? 'line-through' : 'none',
          lineHeight: 1.4, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{task.title}</div>

        {/* All-day chip */}
        {task.is_all_day && (
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
            background: 'rgba(52,211,153,0.12)', color: '#10a371',
            fontWeight: 500, flexShrink: 0,
          }}>All day</span>
        )}

        {/* Time chip */}
        {task.task_time && !task.is_all_day && (
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
            background: 'var(--accent-soft)', color: 'var(--accent)',
            fontWeight: 500, flexShrink: 0,
          }}>{task.task_time.slice(0, 5)}</span>
        )}
      </div>
    </div>
  )
}

/* ─── Main TasksScreen ─── */
export default function TasksScreen({ tasks, onToggle, onDelete, onEdit, onAdd }: TasksScreenProps) {
  const sortedDays = Object.keys(tasks).sort()

  const hasAny = sortedDays.some(dk => tasks[dk].length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>Tasks</h1>
      </div>

      {/* Content */}
      {!hasAny ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px', textAlign: 'center', gap: '14px',
        }}>
          <div style={{ fontSize: '48px' }}>📋</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>No tasks yet</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Add your first task using the AI assistant or the + button below.
          </div>
          <button
            onClick={onAdd}
            style={{
              marginTop: '8px', padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
            }}
          >Add task</button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 150px)' }}>
          {sortedDays.map(dk => {
            const dayTasks = tasks[dk]
            if (dayTasks.length === 0) return null
            const d = parseISO(dk)
            return (
              <div key={dk} style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)',
                  padding: '8px 4px 6px', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {format(d, 'EEEE, MMMM d')}
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: '14px', overflow: 'hidden' }}>
                  {dayTasks.map((t, idx) => (
                    <div key={t.id}>
                      {idx > 0 && <div style={{ height: '1px', background: 'var(--border)', margin: '0 14px' }} />}
                      <TaskRow
                        task={t}
                        dateKey={dk}
                        onToggle={() => onToggle(dk, t.id)}
                        onDelete={() => onDelete(dk, t.id)}
                        onEdit={() => onEdit(t)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={onAdd}
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 82px)',
          right: '20px',
          width: '52px', height: '52px', borderRadius: '50%', border: 'none',
          background: 'var(--accent)', color: '#fff',
          fontSize: '24px', fontWeight: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(232,132,90,0.35)',
          WebkitTapHighlightColor: 'transparent',
          zIndex: 50,
        }}
      >+</button>
    </div>
  )
}
