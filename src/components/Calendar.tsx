import { useState, useMemo, useRef, useEffect } from 'react'
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks } from 'date-fns'
import { useTaskStore } from '../store/taskStore'
import AddTaskModal from './AddTaskModal'
import type { Task } from '../services/supabase'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_H = 64 // px per hour

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

function taskTop(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h * 60 + m) / 60 * HOUR_H
}

function taskHeight(startTime: string, endTime: string | null): number {
  if (!endTime) return HOUR_H
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return Math.max(diff / 60 * HOUR_H, 32)
}

function roundToQuarter(minutes: number): number {
  return Math.round(minutes / 15) * 15
}

interface CalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export default function Calendar({ selectedDate, onSelectDate }: CalendarProps) {
  const { tasks } = useTaskStore()
  const [weekStart, setWeekStart] = useState(
    startOfWeek(selectedDate, { weekStartsOn: 1 })
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [defaultTime, setDefaultTime] = useState('')
  const gridRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  // Scroll to current hour on mount
  useEffect(() => {
    if (gridRef.current) {
      const scrollY = Math.max(0, (today.getHours() - 1) * HOUR_H)
      gridRef.current.scrollTop = scrollY
    }
  }, [])

  // Keep week strip in sync when selectedDate changes from outside
  useEffect(() => {
    const ws = startOfWeek(selectedDate, { weekStartsOn: 1 })
    setWeekStart(ws)
  }, [selectedDate])

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const dateKey = format(selectedDate, 'yyyy-MM-dd')
  const dayTasks = tasks.filter(t => t.task_date === dateKey)
  const timedTasks = dayTasks.filter(t => t.task_time && !t.is_all_day)
  const allDayTasks = dayTasks.filter(t => !t.task_time || t.is_all_day)

  const isSelectedToday = isSameDay(selectedDate, today)
  const nowMinutes = today.getHours() * 60 + today.getMinutes()

  function handleGridTap(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top + (gridRef.current?.scrollTop ?? 0)
    const totalMins = roundToQuarter(Math.floor(y / HOUR_H * 60))
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    const t = `${String(Math.min(h, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    setDefaultTime(t)
    setModalOpen(true)
  }

  function goToPrevWeek() {
    const prev = subWeeks(weekStart, 1)
    setWeekStart(prev)
  }

  function goToNextWeek() {
    const next = addWeeks(weekStart, 1)
    setWeekStart(next)
  }

  function goToToday() {
    const t = new Date()
    setWeekStart(startOfWeek(t, { weekStartsOn: 1 }))
    onSelectDate(t)
  }

  // Group overlapping tasks into columns
  function layoutTasks(tasks: Task[]) {
    const sorted = [...tasks].sort((a, b) =>
      (a.task_time ?? '').localeCompare(b.task_time ?? '')
    )
    const columns: Task[][] = []
    for (const task of sorted) {
      let placed = false
      for (const col of columns) {
        const last = col[col.length - 1]
        const lastEnd = last.task_time_end ?? addHourToTime(last.task_time!)
        if ((task.task_time ?? '') >= lastEnd) {
          col.push(task)
          placed = true
          break
        }
      }
      if (!placed) columns.push([task])
    }
    return columns
  }

  function addHourToTime(time: string): string {
    const [h, m] = time.split(':').map(Number)
    const totalMins = h * 60 + m + 60
    return `${String(Math.min(Math.floor(totalMins / 60), 23)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`
  }

  const taskColumns = layoutTasks(timedTasks)
  const totalCols = taskColumns.length || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--panel)' }}>

      {/* Header */}
      <div style={{
        padding: '12px 16px 8px',
        borderBottom: '1px solid var(--border-soft)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={goToPrevWeek} style={iconBtnStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
            <ChevronLeft />
          </button>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', minWidth: '120px', textAlign: 'center' }}>
            {format(weekStart, 'MMMM yyyy')}
          </span>
          <button onClick={goToNextWeek} style={iconBtnStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
            <ChevronRight />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={goToToday} style={todayBtnStyle}>Today</button>
          <button
            onClick={() => { setDefaultTime(''); setModalOpen(true) }}
            style={{
              width: '30px', height: '30px', borderRadius: '8px', border: 'none',
              background: 'var(--accent)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              boxShadow: '0 0 14px var(--accent-glow)',
            }}
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      {/* Week strip */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-soft)',
        flexShrink: 0,
        background: '#121212',
      }}>
        {/* Gutter spacer */}
        <div style={{ width: '44px', flexShrink: 0 }} />
        {weekDays.map(d => {
          const isToday = isSameDay(d, today)
          const isSelected = isSameDay(d, selectedDate)
          const dk = format(d, 'yyyy-MM-dd')
          const hasTasks = tasks.some(t => t.task_date === dk)

          return (
            <div
              key={dk}
              onClick={() => onSelectDate(new Date(d))}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 0 6px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                color: isToday ? 'var(--accent-2)' : 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {format(d, 'EEE').charAt(0)}
              </span>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isSelected
                  ? 'var(--accent)'
                  : isToday
                  ? 'rgba(217,119,87,0.12)'
                  : 'transparent',
                border: isToday && !isSelected
                  ? '1.5px solid rgba(217,119,87,0.5)'
                  : '1.5px solid transparent',
                transition: 'all 0.15s',
              }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: isToday || isSelected ? 700 : 400,
                  color: isSelected
                    ? '#fff'
                    : isToday
                    ? 'var(--accent-2)'
                    : 'var(--text)',
                }}>
                  {d.getDate()}
                </span>
              </div>
              {/* Task dot */}
              <div style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: hasTasks
                  ? (isSelected ? 'var(--accent-2)' : '#444')
                  : 'transparent',
              }} />
            </div>
          )
        })}
      </div>

      {/* All-day strip */}
      {allDayTasks.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px 6px 44px',
          gap: '4px',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border-soft)',
          flexShrink: 0,
          minHeight: '32px',
          background: '#111',
        }}>
          <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginRight: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>All-day</span>
          {allDayTasks.map(t => (
            <div key={t.id} style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'var(--accent-soft)',
              color: '#f0b899',
              borderLeft: '2px solid var(--accent-2)',
              lineHeight: 1.4,
            }}>
              {t.title}
            </div>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div
        ref={gridRef}
        style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
      >
        <div
          style={{ position: 'relative', height: `${24 * HOUR_H}px` }}
          onClick={handleGridTap}
        >
          {/* Hour rows */}
          {HOURS.map(h => (
            <div
              key={h}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${h * HOUR_H}px`,
                height: `${HOUR_H}px`,
                display: 'flex',
                alignItems: 'flex-start',
                borderTop: h === 0 ? 'none' : '1px solid var(--border-soft)',
                pointerEvents: 'none',
              }}
            >
              <span style={{
                width: '40px',
                paddingRight: '8px',
                flexShrink: 0,
                fontSize: '10px',
                color: 'var(--text-muted)',
                textAlign: 'right',
                lineHeight: 1,
                marginTop: h === 0 ? '2px' : '-5px',
              }}>
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </span>
            </div>
          ))}

          {/* 30-min dividers */}
          {HOURS.map(h => (
            <div
              key={`half-${h}`}
              style={{
                position: 'absolute',
                left: '40px',
                right: 0,
                top: `${h * HOUR_H + HOUR_H / 2}px`,
                borderTop: '1px solid rgba(255,255,255,0.03)',
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Current time indicator */}
          {isSelectedToday && (
            <div
              style={{
                position: 'absolute',
                left: '40px',
                right: '8px',
                top: `${nowMinutes / 60 * HOUR_H}px`,
                height: '2px',
                background: '#ef4444',
                zIndex: 4,
                pointerEvents: 'none',
              }}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ef4444',
                position: 'absolute',
                left: '-4px',
                top: '-3px',
              }} />
            </div>
          )}

          {/* Task blocks */}
          {taskColumns.map((col, colIdx) =>
            col.map(task => (
              <div
                key={task.id}
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  left: `${44 + (colIdx / totalCols) * (100 - 44 / 4)}%`,
                  width: `calc(${(1 / totalCols) * 92}% - 4px)`,
                  top: `${taskTop(task.task_time!)}px`,
                  height: `${taskHeight(task.task_time!, task.task_time_end)}px`,
                  background: 'rgba(217,119,87,0.15)',
                  border: '1px solid rgba(217,119,87,0.35)',
                  borderLeft: '3px solid var(--accent)',
                  borderRadius: '6px',
                  padding: '4px 7px',
                  overflow: 'hidden',
                  zIndex: 2,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(217,119,87,0.25)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(217,119,87,0.15)'}
              >
                <div style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: 'var(--accent-2)',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {task.title}
                </div>
                {taskHeight(task.task_time!, task.task_time_end) > 40 && (
                  <div style={{ fontSize: '10px', color: 'rgba(240,184,153,0.65)', marginTop: '2px' }}>
                    {task.task_time?.slice(0, 5)}
                    {task.task_time_end ? ` – ${task.task_time_end.slice(0, 5)}` : ''}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <AddTaskModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setDefaultTime('') }}
        defaultDate={selectedDate}
        defaultTime={defaultTime}
      />
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  width: '30px',
  height: '30px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background 0.15s',
  WebkitTapHighlightColor: 'transparent',
}

const todayBtnStyle: React.CSSProperties = {
  fontSize: '11.5px',
  color: 'var(--text-2)',
  padding: '5px 10px',
  borderRadius: '7px',
  border: '1px solid #2a2a2a',
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
  WebkitTapHighlightColor: 'transparent',
}

function hoverIn(e: React.MouseEvent<HTMLButtonElement>) {
  (e.currentTarget as HTMLElement).style.background = '#1a1a1a'
}
function hoverOut(e: React.MouseEvent<HTMLButtonElement>) {
  (e.currentTarget as HTMLElement).style.background = 'transparent'
}
