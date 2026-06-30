import { useState, useEffect, useRef } from 'react'
import { format, addDays } from 'date-fns'
import { useTaskStore } from '../store/taskStore'
import type { Task, TaskLabel, RecurrenceType, TaskStatus, TaskPriority } from '../services/supabase'
import { TASK_STATUSES, TASK_PRIORITIES, parseLabelFromDescription, stripLabelFromDescription, encodeLabelInDescription } from '../services/supabase'
import { IcoChevronDown } from './icons'

interface Props {
  isOpen: boolean
  onClose: () => void
  defaultDate: Date
  defaultTime?: string
  defaultProjectId?: string | null
  editTask?: Task
}

function calcPinEnd(dur: 'week' | 'month' | 'quarter'): string {
  const d = new Date()
  if (dur === 'week') d.setDate(d.getDate() + 7)
  else if (dur === 'month') d.setMonth(d.getMonth() + 1)
  else d.setMonth(d.getMonth() + 3)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function AddTaskModal({ isOpen, onClose, defaultDate, defaultTime = '', defaultProjectId = null, editTask }: Props) {
  const { addTask, updateTask, projects } = useTaskStore()
  const isEditMode = !!editTask

  const [title, setTitle]         = useState('')
  const [date, setDate]           = useState(fmtDate(defaultDate))
  const [time, setTime]           = useState('')
  const [timeEnd, setTimeEnd]     = useState('')
  const [isAllDay, setIsAllDay]   = useState(false)
  const [label, setLabel]         = useState<TaskLabel>('personal')
  const [recurrence, setRecurrence] = useState<RecurrenceType | null>(null)
  const [isPinned, setIsPinned]   = useState(false)
  const [pinDuration, setPinDuration] = useState<'week' | 'month' | 'quarter'>('week')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [status, setStatus]       = useState<TaskStatus>('not_started')
  const [priority, setPriority]   = useState<TaskPriority>('medium')
  const [timeEstimate, setTimeEstimate] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [saving, setSaving]       = useState(false)
  const [visible, setVisible]     = useState(false)
  const [error, setError]         = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

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
      setRecurrence(editTask.recurrence ?? null)
      setProjectId(editTask.project_id ?? null)
      setStatus(editTask.status ?? 'not_started')
      setPriority(editTask.priority ?? 'medium')
      setTimeEstimate(editTask.time_estimate ?? null)
    }
  }, [isOpen, editTask])

  // Sync defaultDate + defaultTime only when modal first opens in add mode
  useEffect(() => {
    if (isOpen && !editTask) {
      setDate(fmtDate(defaultDate))
      setProjectId(defaultProjectId)
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
        setLabel('personal'); setRecurrence(null); setIsPinned(false); setPinDuration('week'); setDescription(''); setSaving(false); setError('')
        setProjectId(null); setStatus('not_started'); setPriority('medium'); setTimeEstimate(null)
        setExpandedRow(null)
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

  function toggleRow(key: string) {
    setExpandedRow(prev => prev === key ? null : key)
  }

  async function handleSubmit() {
    if (saving) return
    if (!title.trim()) { setError('Enter a task title'); return }
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
        is_done: isEditMode ? (editTask?.is_done ?? false) : false,
        description: encodedDesc || null,
        recurrence: recurrence ?? null,
        is_pinned: isPinned,
        pin_end: isPinned ? calcPinEnd(pinDuration) : null,
        project_id: projectId ?? null,
        status,
        priority,
        time_estimate: timeEstimate ?? null,
      }
      if (isEditMode && editTask) {
        await updateTask(editTask.id, payload)
      } else {
        await addTask(payload)
      }
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      console.error('AddTask error:', err)
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

        {/* Title + description */}
        <div style={{ padding: '18px 22px 6px' }}>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit() } }}
            placeholder="Task title…"
            style={{ font: '300 24px/1.2 var(--font-sans)', color: title ? '#F0ECE3' : 'rgba(240,236,227,0.35)', background: 'transparent', border: 'none', outline: 'none', width: '100%' }}
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={1}
            style={{ font: '400 13px/1.2 var(--font-sans)', color: 'rgba(255,255,255,0.5)', background: 'transparent', border: 'none', outline: 'none', width: '100%', resize: 'none', marginTop: 9 }}
          />
        </div>

        {/* Metadata rows */}
        <div>
          {/* Row 1 — Project */}
          <button onClick={() => toggleRow('project')} style={rowBtn(false)}>
            <span style={rowLeft}>{icoFolder}<span style={rowLabelTxt}>Project</span></span>
            {projectId
              ? (() => { const p = projects.find(pr => pr.id === projectId); return <span style={valuePill()}><span style={{ width: 8, height: 8, borderRadius: '50%', background: p?.color ?? '#D97757' }} />{p?.name ?? '—'}</span> })()
              : <span style={valuePill('rgba(255,255,255,0.4)')}>No project</span>}
          </button>
          <div style={expandWrap(expandedRow === 'project')}>
            <div style={expandInner}>
              <button onClick={() => setProjectId(null)} style={pill(projectId === null)}>No project</button>
              {projects.filter(p => !p.is_archived).map(p => (
                <button key={p.id} onClick={() => setProjectId(p.id)} style={{ ...pill(projectId === p.id), gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />{p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2 — Status */}
          <button onClick={() => toggleRow('status')} style={rowBtn(false)}>
            <span style={rowLeft}><span style={{ color: TASK_STATUSES[status].color, fontSize: 14 }}>{TASK_STATUSES[status].icon}</span><span style={rowLabelTxt}>Status</span></span>
            <span style={valuePill(TASK_STATUSES[status].color)}>{TASK_STATUSES[status].name}</span>
          </button>
          <div style={expandWrap(expandedRow === 'status')}>
            <div style={expandInner}>
              {(Object.entries(TASK_STATUSES) as [TaskStatus, { name: string; color: string; icon: string }][]).map(([k, v]) => (
                <button key={k} onClick={() => setStatus(k)} style={{ ...pill(status === k), gap: 5, background: status === k ? v.color : 'var(--surface2)', color: status === k ? '#fff' : 'var(--text-muted)' }}>
                  <span>{v.icon}</span>{v.name}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3 — Priority */}
          <button onClick={() => toggleRow('priority')} style={rowBtn(false)}>
            <span style={rowLeft}><span style={{ color: TASK_PRIORITIES[priority].color, font: '700 14px/1.2 var(--font-sans)' }}>{priority === 'high' ? '↑' : priority === 'low' ? '↓' : '–'}</span><span style={rowLabelTxt}>Priority</span></span>
            <span style={valuePill(TASK_PRIORITIES[priority].color)}>{TASK_PRIORITIES[priority].name}</span>
          </button>
          <div style={expandWrap(expandedRow === 'priority')}>
            <div style={expandInner}>
              {(Object.entries(TASK_PRIORITIES) as [TaskPriority, { name: string; color: string }][]).map(([k, v]) => (
                <button key={k} onClick={() => setPriority(k)} style={{ ...pill(priority === k), background: priority === k ? v.color : 'var(--surface2)', color: priority === k ? '#fff' : 'var(--text-muted)' }}>
                  {k === 'high' ? '↑ ' : k === 'low' ? '↓ ' : '– '}{v.name}
                </button>
              ))}
            </div>
          </div>

          {/* Row 4 — Estimate */}
          <button onClick={() => toggleRow('estimate')} style={rowBtn(false)}>
            <span style={rowLeft}>{icoClock}<span style={rowLabelTxt}>Estimate</span></span>
            <span style={valuePill(timeEstimate != null ? '#D97757' : 'rgba(255,255,255,0.4)')}>{estimateLabel(timeEstimate)}</span>
          </button>
          <div style={expandWrap(expandedRow === 'estimate')}>
            <div style={expandInner}>
              {([15,30,60,120,240,480]).map(mins => (
                <button key={mins} onClick={() => setTimeEstimate(timeEstimate === mins ? null : mins)} style={pill(timeEstimate === mins)}>
                  {estimateLabel(mins)}
                </button>
              ))}
            </div>
          </div>

          {/* Row 5 — Date */}
          <button onClick={() => toggleRow('date')} style={rowBtn(false)}>
            <span style={rowLeft}>{icoCalendar}<span style={rowLabelTxt}>Date</span></span>
            <span style={valuePill('#D97757')}>{date === todayStr ? 'Today' : date === tomorrowStr ? 'Tomorrow' : datePillLabel()}</span>
          </button>
          <div style={expandWrap(expandedRow === 'date')}>
            <div style={expandInner}>
              {([{ label: 'Today', value: todayStr }, { label: 'Tomorrow', value: tomorrowStr }, { label: 'Next week', value: nextWeekStr }] as const).map(({ label: l, value: v }) => (
                <button key={v} onClick={() => setDate(v)} style={pill(date === v)}>{l}</button>
              ))}
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <span style={{ ...pill(!isPreset), pointerEvents: 'none' }}>{isPreset ? 'Pick…' : datePillLabel()}</span>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </div>
            </div>
          </div>

          {/* Row 6 — Time */}
          <button onClick={() => toggleRow('time')} style={rowBtn(true)}>
            <span style={rowLeft}>{icoBell}<span style={rowLabelTxt}>Time</span></span>
            <span style={valuePill(time && !isAllDay ? '#D97757' : 'rgba(255,255,255,0.4)')}>{isAllDay ? 'All day' : (time ? time.slice(0,5) : '—')}</span>
          </button>
          <div style={expandWrap(expandedRow === 'time')}>
            <div style={expandInner}>
              <button
                onClick={() => {
                  if (!isAllDay) { prevTimeRef.current = time; prevTimeEndRef.current = timeEnd; setTime(''); setTimeEnd('') }
                  else { setTime(prevTimeRef.current); setTimeEnd(prevTimeEndRef.current) }
                  setIsAllDay(!isAllDay)
                }}
                style={pill(isAllDay)}
              >All day</button>
              {!isAllDay && (
                <>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <span style={{ ...pill(!!time), pointerEvents: 'none', minWidth: 72, justifyContent: 'center' }}>{time ? time.slice(0,5) : 'Start'}</span>
                    <input type="time" value={time} onChange={e => handleTimeChange(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                  </div>
                  {time && (
                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                      <span style={{ ...pill(!!timeEnd), pointerEvents: 'none', minWidth: 72, justifyContent: 'center' }}>{timeEnd ? timeEnd.slice(0,5) : 'End'}</span>
                      <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Save */}
        <div style={{ padding: '18px 22px 30px' }}>
          {error && (
            <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', color: 'var(--danger)', fontSize: 12, padding: '10px 14px', borderRadius: 12, lineHeight: 1.5, marginBottom: 12 }}>
              ⚠ {error}
            </div>
          )}
          <button onClick={handleSubmit} style={{ width: '100%', height: 52, background: '#D97757', borderRadius: 12, border: 'none', color: '#fff', font: '600 14px/1.2 var(--font-sans)', boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? (isEditMode ? 'Saving…' : 'Adding…') : (isEditMode ? 'Save' : 'Add task')}
          </button>
        </div>
      </div>
    </div>
  )
}

function rowBtn(last: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 48, borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.07)',
    padding: '0 22px', background: 'transparent', width: '100%', cursor: 'pointer',
    fontFamily: 'inherit',
  }
}

const rowLeft: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }
const rowLabelTxt: React.CSSProperties = { font: '500 14px/1.2 var(--font-sans)', color: '#F0ECE3' }

function valuePill(color = 'rgba(255,255,255,0.7)'): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderRadius: 999, background: '#2D2926',
    font: '500 13px/1.2 var(--font-sans)', color, whiteSpace: 'nowrap',
  }
}

function expandWrap(open: boolean): React.CSSProperties {
  return { maxHeight: open ? 360 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease' }
}
const expandInner: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', padding: '6px 22px 14px' }

function estimateLabel(mins: number | null): string {
  if (mins == null) return '—'
  return mins >= 60 ? `${mins % 60 === 0 ? mins / 60 : (mins / 60).toFixed(1)}h` : `${mins}m`
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

const icoFolder = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
)
const icoClock = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
)
const icoCalendar = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
)
const icoBell = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
)
