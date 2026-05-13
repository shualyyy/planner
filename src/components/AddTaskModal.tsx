import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { useTaskStore } from '../store/taskStore'
import type { Task } from '../services/supabase'

interface Props {
  isOpen: boolean
  onClose: () => void
  defaultDate: Date
  editTask?: Task
}

export default function AddTaskModal({ isOpen, onClose, defaultDate, editTask }: Props) {
  const { addTask, fetchTasks, updateTask } = useTaskStore()
  const isEditMode = !!editTask

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(format(defaultDate, 'yyyy-MM-dd'))
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')

  const titleRef = useRef<HTMLInputElement>(null)

  // Populate fields when opening in edit mode
  useEffect(() => {
    if (isOpen && editTask) {
      setTitle(editTask.title)
      setDate(editTask.task_date)
      setTime(editTask.task_time ?? '')
      setDescription(editTask.description ?? '')
    }
  }, [isOpen, editTask])

  // Sync defaultDate only in add mode
  useEffect(() => {
    if (!editTask) setDate(format(defaultDate, 'yyyy-MM-dd'))
  }, [defaultDate, editTask])

  // Mount / unmount animation
  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setTimeout(() => titleRef.current?.focus(), 60)
    } else {
      setVisible(false)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setTitle('')
        setTime('')
        setDescription('')
        setSaving(false)
        setError('')
      }, 200)
    }
  }, [isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')
    try {
      if (isEditMode && editTask) {
        await updateTask(editTask.id, {
          title: title.trim(),
          task_date: date,
          task_time: time || null,
          description: description.trim() || null,
        })
      } else {
        await addTask({
          title: title.trim(),
          task_date: date,
          task_time: time || null,
          description: description.trim() || null,
        })
        await fetchTasks()
      }
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      setError(msg)
      setSaving(false)
    }
  }

  if (!isOpen && !visible) return null

  const isMobile = window.innerWidth < 768
  const shown = isOpen && visible

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        opacity: shown ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: isMobile ? '100%' : '420px',
          background: 'var(--panel)',
          border: isMobile ? 'none' : '1px solid var(--border)',
          borderTop: '1px solid var(--border)',
          borderRadius: isMobile ? '18px 18px 0 0' : '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          transform: shown
            ? 'translateY(0)'
            : isMobile ? 'translateY(100%)' : 'translateY(12px)',
          transition: 'transform 0.25s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle (mobile only) */}
        {isMobile && (
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#333', margin: '-8px auto 0' }} />
        )}

        {/* Title */}
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {isEditMode ? 'Edit task' : 'Add task'}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
              color: '#fca5a5', fontSize: '12px', padding: '8px 12px',
              borderRadius: '8px', lineHeight: 1.4,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Task name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Title <span style={{ color: 'var(--accent-2)' }}>*</span></label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Meeting with Alex"
              required
              style={inputStyle}
            />
          </div>

          {/* Date + Time row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Time <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional notes…"
              rows={2}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                background: 'var(--panel-2)', border: '1px solid var(--border)',
                color: 'var(--text-2)', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                background: title.trim() && !saving ? 'var(--accent)' : '#2a2a2a',
                color: title.trim() && !saving ? '#fff' : 'var(--text-muted)',
                fontSize: '13px', fontWeight: 600,
                cursor: title.trim() && !saving ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', transition: 'all 0.15s',
                boxShadow: title.trim() && !saving ? '0 0 18px var(--accent-glow)' : 'none',
              }}
            >
              {saving
                ? (isEditMode ? 'Saving…' : 'Adding…')
                : (isEditMode ? 'Save changes' : 'Add task')
              }
            </button>
          </div>
        </form>
      </div>

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(0.4);
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '11.5px',
  fontWeight: 500,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--panel-2)',
  border: '1px solid var(--border)',
  borderRadius: '9px',
  padding: '9px 12px',
  color: 'var(--text)',
  fontSize: '13px',
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  colorScheme: 'dark',
}
