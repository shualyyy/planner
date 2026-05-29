import { useState, useEffect, useRef } from 'react'
import { format, addDays } from 'date-fns'
import { useTaskStore } from '../store/taskStore'
import type { Task, TaskLabel } from '../services/supabase'
import { TASK_LABELS, parseLabelFromDescription, stripLabelFromDescription, encodeLabelInDescription } from '../services/supabase'
import { IcoChevronDown } from './icons'

interface Props {
  isOpen: boolean
  onClose: () => void
  defaultDate: Date
  defaultTime?: string
  editTask?: Task
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function AddTaskModal({ isOpen, onClose, defaultDate, defaultTime = '', editTask }: Props) {
  const { addTask, updateTask } = useTaskStore()
  const isEditMode = !!editTask

  const [title, setTitle]         = useState('')
  const [date, setDate]           = useState(fmtDate(defaultDate))
  const [time, setTime]           = useState('')
  const [timeEnd, setTimeEnd]     = useState('')
  const [isAllDay, setIsAllDay]   = useState(false)
  const [label, setLabel]         = useState<TaskLabel>('personal')
  const [description, setDescription] = useState('')
  const [saving, setSaving]       = useState(false)
  const [visible, setVisible]     = useState(false)
  const [error, setError]         = useState('')

  const titleRef = useRef<HTMLInputElement>(null)
  const prevTimeRef = useRef('')
  const prevTimeEndRef = useRef('')

  const todayStr    = fmtDate(new Date())
  const tomorrowStr = fmtDate(addDays(new Date(), 1))
  const nextWeekStr = fmtDate(addDays(new Date(), 7))

  // Populate fields in edit mode
  useEffect(() => {
    if (isOpen && editTask) {
      setTitle(editTask.title)
      setDate(editTask.task_date)
      setTime(editTask.task_time ?? '')
      setTimeEnd(editTask.task_time_end ?? '')
      setIsAllDay(editTask.is_all_day ?? false)
      setLabel(parseLabelFromDescription(editTask.description))
      setDescription(stripLabelFromDescription(editTask.description))
    }
  }, [isOpen, editTask])

  // Sync defaultDate + defaultTime only when modal first opens in add mode
  useEffect(() => {
    if (isOpen && !editTask) {
      setDate(fmtDate(defaultDate))
      setTime(defaultTime)
      if (defaultTime) {
        const [h, m] = defaultTime.split(':').map(Number)
        const endH = Math.min(h + 1, 23)
        setTimeEnd(`${String(endH).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
      } else {
        setTimeEnd('')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Mount / unmount animation
  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setTimeout(() => titleRef.current?.focus(), 80)
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

  // Reset when closes — guarded so rapid reopen doesn't apply stale reset
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setTitle(''); setTime(''); setTimeEnd(''); setIsAllDay(false)
        setLabel('personal'); setDescription(''); setSaving(false); setError('')
        setVisible(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  function handleTimeChange(val: string) {
    setTime(val)
    if (val && !timeEnd) {
      const [h, m] = val.split(':').map(Number)
      const endH = Math.min(h + 1, 23)
      setTimeEnd(`${String(endH).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    }
  }

  async function handleSubmit() {
    if (!title.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const encodedDesc = encodeLabelInDescription(label, description.trim())
      const payload = {
        title: title.trim(),
        task_date: date,
        task_time: isAllDay ? null : (time || null),
        task_time_end: isAllDay ? null : (timeEnd || null),
        is_all_day: isAllDay,
        is_done: false as const,
        description: encodedDesc || null,
      }
      if (isEditMode && editTask) {
        await updateTask(editTask.id, payload)
      } else {
        await addTask(payload)
      }
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      setError(msg)
      setSaving(false)
    }
  }

  if (!isOpen && !visible) return null

  const shown = isOpen && visible

  function datePillLabel(): string {
    try {
      return format(new Date(date + 'T12:00'), 'MMM d')
    } catch {
      return date
    }
  }

  const isPreset = date === todayStr || date === tomorrowStr || date === nextWeekStr

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: shown ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0)',
        backdropFilter: shown ? 'blur(4px)' : 'none',
        WebkitBackdropFilter: shown ? 'blur(4px)' : 'none',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        transition: 'background 0.25s ease, backdrop-filter 0.25s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '560px',
          background: 'var(--surface)',
          borderRadius: '28px 28px 0 0',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          boxShadow: 'var(--sheet-shadow)',
          transform: shown ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 20px 2px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {isEditMode ? 'Edit task' : 'New task'}
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '4px', borderRadius: '50%', background: 'var(--surface2)', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcoChevronDown size={15} />
          </button>
        </div>

        <div style={{ padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', color: 'var(--danger)', fontSize: '12px', padding: '8px 12px', borderRadius: '10px', lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          {/* Title — Fraunces */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit() } }}
            placeholder={isEditMode ? 'Task title' : 'What needs to happen?'}
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '22px',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              width: '100%',
              lineHeight: 1.3,
            }}
          />

          {/* Date pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={metaLabel}>Date</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {([
                { label: 'Today',     value: todayStr    },
                { label: 'Tomorrow',  value: tomorrowStr },
                { label: 'Next week', value: nextWeekStr },
              ] as const).map(({ label: l, value: v }) => (
                <button key={v} onClick={() => setDate(v)} style={pill(date === v)}>
                  {l}
                </button>
              ))}
              {!isPreset && (
                <span style={pill(true)}>{datePillLabel()}</span>
              )}
              {/* Hidden date input overlay for custom date */}
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <span style={{ ...pill(false), pointerEvents: 'none', paddingLeft: '10px', paddingRight: '10px' }}>···</span>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={metaLabel}>Time</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  if (!isAllDay) {
                    prevTimeRef.current = time
                    prevTimeEndRef.current = timeEnd
                    setTime(''); setTimeEnd('')
                  } else {
                    setTime(prevTimeRef.current)
                    setTimeEnd(prevTimeEndRef.current)
                  }
                  setIsAllDay(!isAllDay)
                }}
                style={pill(isAllDay)}
              >All day</button>
              {!isAllDay && (
                <>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <span style={{ ...pill(!!time), pointerEvents: 'none', minWidth: '72px', justifyContent: 'center' }}>
                      {time ? time.slice(0,5) : 'Start'}
                    </span>
                    <input
                      type="time"
                      value={time}
                      onChange={e => handleTimeChange(e.target.value)}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    />
                  </div>
                  {time && (
                    <>
                      <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>→</span>
                      <div style={{ position: 'relative', display: 'inline-flex' }}>
                        <span style={{ ...pill(!!timeEnd), pointerEvents: 'none', minWidth: '72px', justifyContent: 'center' }}>
                          {timeEnd ? timeEnd.slice(0,5) : 'End'}
                        </span>
                        <input
                          type="time"
                          value={timeEnd}
                          onChange={e => setTimeEnd(e.target.value)}
                          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Label pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={metaLabel}>Label</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(Object.entries(TASK_LABELS) as [TaskLabel, { name: string; color: string }][]).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setLabel(k)}
                  style={{
                    ...pill(label === k),
                    background: label === k ? v.color : 'var(--surface2)',
                    color: label === k ? '#1C1917' : 'var(--text-muted)',
                  }}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          {/* Description (optional, compact) */}
          <div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              style={{
                width: '100%', background: 'var(--surface2)', border: '1px solid var(--hairline)',
                borderRadius: '12px', padding: '10px 14px', color: 'var(--text)',
                fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                resize: 'none', lineHeight: 1.5, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || saving}
            style={{
              width: '100%', height: '52px',
              borderRadius: '16px', border: 'none',
              background: title.trim() && !saving ? 'var(--accent)' : 'var(--surface2)',
              color: title.trim() && !saving ? '#fff' : 'var(--text-muted)',
              fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em',
              cursor: title.trim() && !saving ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              boxShadow: title.trim() && !saving
                ? '0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 24px var(--accent-glow)'
                : 'none',
              fontFamily: 'inherit',
            }}
          >
            {saving
              ? (isEditMode ? 'Saving…' : 'Adding…')
              : (isEditMode ? 'Save changes' : 'Add task')
            }
          </button>
        </div>
      </div>
    </div>
  )
}

const metaLabel: React.CSSProperties = {
  fontSize: '10.5px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--text-muted)',
}

function pill(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 14px',
    borderRadius: '999px',
    fontSize: '12.5px',
    fontWeight: 550,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? 'var(--text)' : 'var(--surface2)',
    color: active ? 'var(--bg)' : 'var(--text-muted)',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  }
}
