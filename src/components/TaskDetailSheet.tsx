import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { format, parseISO } from 'date-fns'
import type { Task } from '../services/supabase'
import { TASK_STATUSES, TASK_PRIORITIES, parseLabelFromDescription, stripLabelFromDescription, TASK_LABELS } from '../services/supabase'
import { useTaskStore } from '../store/taskStore'

interface Props {
  task: Task & { done: boolean } | null
  onClose: () => void
  onEdit: (t: Task) => void
  onDelete: (t: Task) => void
}

export default function TaskDetailSheet({ task, onClose, onEdit, onDelete }: Props) {
  const { projects, members, fetchMembers, taskComments, fetchTaskComments, addTaskComment, profile } = useTaskStore()
  const [visible, setVisible] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Drag-to-close
  const dragStartY = useRef(0)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  function onSheetDragStart(e: React.TouchEvent) { dragStartY.current = e.touches[0].clientY; setIsDragging(true) }
  function onSheetDragMove(e: React.TouchEvent) { setDragY(Math.max(0, e.touches[0].clientY - dragStartY.current)) }
  function onSheetDragEnd() { setIsDragging(false); if (dragY > 100) { setDragY(0); onClose() } else setDragY(0) }

  useEffect(() => {
    if (task) {
      setVisible(true)
      fetchTaskComments(task.id)
      if (task.project_id) fetchMembers(task.project_id)
    } else {
      const t = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task])

  const comments = task ? (taskComments[task.id] || []) : []

  useEffect(() => {
    if (commentsEndRef.current) commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const project = useMemo(() => task?.project_id ? projects.find(p => p.id === task.project_id) : null, [projects, task?.project_id])
  const assignee = useMemo(() => {
    if (!task?.assigned_to || !task.project_id) return null
    return (members[task.project_id] || []).find(m => m.user_id === task.assigned_to) ?? null
  }, [members, task?.assigned_to, task?.project_id])

  async function handlePost() {
    if (!task || !commentText.trim()) return
    setPosting(true)
    try {
      await addTaskComment(task.id, commentText.trim())
      setCommentText('')
    } catch (e) { console.error(e) }
    setPosting(false)
  }

  if (!task && !visible) return null
  const shown = task && visible
  const displayTitle = task?.title ?? ''
  const descRaw = task?.description ? stripLabelFromDescription(task.description) : ''
  const label = task ? parseLabelFromDescription(task.description) : null

  const pill: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 999,
    background: 'var(--surface2)', color: 'var(--text-2)',
    font: '500 11.5px/1 var(--font-sans)', flexShrink: 0,
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 650,
        background: shown ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0)',
        backdropFilter: shown ? 'blur(4px)' : 'none',
        WebkitBackdropFilter: shown ? 'blur(4px)' : 'none',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        transition: 'background 0.25s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, background: 'var(--surface)',
          borderRadius: '28px 28px 0 0',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--sheet-shadow)',
          transform: `translateY(${shown ? dragY : window.innerHeight}px)`,
          transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Drag handle */}
        <div
          onTouchStart={onSheetDragStart}
          onTouchMove={onSheetDragMove}
          onTouchEnd={onSheetDragEnd}
          style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', cursor: 'grab', flexShrink: 0 }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '10px 22px 12px', display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '300 26px/1.2 var(--font-sans)', color: 'var(--text)', letterSpacing: '-0.01em', wordBreak: 'break-word' }}>
              {displayTitle}
            </div>
          </div>
          {task && (
            <button
              onClick={() => { onEdit(task); onClose() }}
              title="Edit task"
              style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--surface2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', cursor: 'pointer', flexShrink: 0 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Scroll body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 20px' }}>
          {/* Meta pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={pill}>📅 {task ? format(parseISO(task.task_date), 'MMM d') : ''}</span>
            {task?.task_time && <span style={pill}>🕒 {task.task_time.slice(0, 5)}</span>}
            {task?.priority && (
              <span style={{ ...pill, color: TASK_PRIORITIES[task.priority].color }}>
                {task.priority === 'high' ? '↑' : task.priority === 'low' ? '↓' : '–'} {TASK_PRIORITIES[task.priority].name}
              </span>
            )}
            {task?.status && (
              <span style={{ ...pill, color: TASK_STATUSES[task.status].color }}>
                {TASK_STATUSES[task.status].icon} {TASK_STATUSES[task.status].name}
              </span>
            )}
            {project && (
              <span style={{ ...pill, color: project.color }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: project.color }} /> {project.name}
              </span>
            )}
            {label && (
              <span style={{ ...pill, color: TASK_LABELS[label].color }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: TASK_LABELS[label].color }} /> {TASK_LABELS[label].name}
              </span>
            )}
          </div>

          {/* Description */}
          {descRaw && (
            <div style={{ font: '400 14px/1.5 var(--font-sans)', color: 'var(--text-2)', marginBottom: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {descRaw}
            </div>
          )}

          {/* Assignee */}
          {assignee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 12, marginBottom: 14 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: assignee.profile?.avatar_color ?? 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                font: '700 12px/1 var(--font-sans)', color: '#fff', flexShrink: 0,
              }}>
                {(assignee.profile?.display_name ?? assignee.profile?.email ?? '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '500 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>Assigned to</div>
                <div style={{ font: '600 13px/1.2 var(--font-sans)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {assignee.user_id === profile?.id ? 'You' : (assignee.profile?.display_name ?? assignee.profile?.email ?? '—')}
                </div>
              </div>
            </div>
          )}

          {/* Comments */}
          <div style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            Comments {comments.length > 0 && <span style={{ color: 'var(--text-2)' }}>· {comments.length}</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {comments.length === 0 && (
              <div style={{ font: '400 12px/1.4 var(--font-sans)', color: 'var(--text-muted)', padding: '4px 0' }}>
                No comments yet.
              </div>
            )}
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: c.profile?.avatar_color ?? 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  font: '700 11px/1 var(--font-sans)', color: '#fff', flexShrink: 0,
                }}>
                  {(c.profile?.display_name ?? c.profile?.email ?? '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--text)' }}>
                      {c.user_id === profile?.id ? 'You' : (c.profile?.display_name ?? c.profile?.email ?? '—')}
                    </span>
                    <span style={{ font: '400 10.5px/1 var(--font-sans)', color: 'var(--text-muted)' }}>
                      {format(new Date(c.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <div style={{ font: '400 13.5px/1.4 var(--font-sans)', color: 'var(--text-2)', marginTop: 3, wordBreak: 'break-word' }}>{c.text}</div>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          {/* Add comment */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handlePost() }}
              placeholder="Add a comment…"
              style={{
                flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '10px 14px',
                color: 'var(--text)', font: '400 13px/1.2 var(--font-sans)',
                outline: 'none',
              }}
            />
            <button
              onClick={handlePost}
              disabled={!commentText.trim() || posting}
              style={{
                width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                background: commentText.trim() ? 'var(--accent)' : 'var(--surface2)',
                color: commentText.trim() ? '#fff' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l14-7-7 14-2-5-5-2z"/></svg>
            </button>
          </div>

          {/* Delete */}
          {task && (
            <button
              onClick={() => { if (confirm('Delete this task?')) { onDelete(task); onClose() } }}
              style={{
                width: '100%', height: 46, borderRadius: 14,
                border: '1px solid var(--danger-border)',
                background: 'var(--danger-soft)',
                color: 'var(--danger)',
                font: '600 13px/1 var(--font-sans)', cursor: 'pointer',
              }}
            >Delete task</button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
