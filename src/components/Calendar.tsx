import { useState, useMemo } from 'react'
import { format, addMonths, subMonths, startOfMonth, isSameDay, isSameMonth } from 'date-fns'
import { useTaskStore } from '../store/taskStore'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)

interface CalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export default function Calendar({ selectedDate, onSelectDate }: CalendarProps) {
  const { tasks } = useTaskStore()
  const [viewMonth, setViewMonth] = useState(new Date())
  const today = new Date()

  const grid = useMemo(() => {
    const first = startOfMonth(viewMonth)
    const rawDow = first.getDay()
    const offset = (rawDow + 6) % 7 // Monday-first
    const start = new Date(first)
    start.setDate(1 - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [viewMonth])

  const tasksByDate = useMemo(() => {
    return tasks.reduce<Record<string, typeof tasks>>((acc, t) => {
      if (!acc[t.task_date]) acc[t.task_date] = []
      acc[t.task_date].push(t)
      return acc
    }, {})
  }, [tasks])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--panel)',
      flex: 1,
      minHeight: 0,
    }}>
      {/* Header */}
      <div style={{
        height: '56px',
        padding: '0 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-soft)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => setViewMonth(subMonths(viewMonth, 1))} style={iconBtnStyle}>
            <ChevronLeft />
          </button>
          <div style={{ fontSize: '13px', fontWeight: 550, color: 'var(--text)', minWidth: '110px', textAlign: 'center' }}>
            {format(viewMonth, 'MMMM yyyy')}
          </div>
          <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} style={iconBtnStyle}>
            <ChevronRight />
          </button>
        </div>
        <button
          onClick={() => { setViewMonth(new Date()); onSelectDate(new Date()) }}
          style={todayPillStyle}
        >
          Today
        </button>
      </div>

      {/* Calendar body */}
      <div style={{ flex: 1, padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Weekday labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', paddingBottom: '10px', borderBottom: '1px solid var(--border-soft)' }}>
          {WEEKDAYS.map(w => (
            <div key={w} style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {w}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', paddingTop: '6px' }}>
          {grid.map((d, i) => {
            const dateKey = format(d, 'yyyy-MM-dd')
            const isOther = !isSameMonth(d, viewMonth)
            const isToday = isSameDay(d, today)
            const isSelected = isSameDay(d, selectedDate)
            const isWeekend = d.getDay() === 0 || d.getDay() === 6
            const dayTasks = tasksByDate[dateKey] || []
            const count = dayTasks.length

            return (
              <div
                key={i}
                onClick={() => onSelectDate(new Date(d))}
                style={{
                  ...dayCellBaseStyle,
                  border: isToday
                    ? '1px solid rgba(217, 119, 87, 0.55)'
                    : isSelected
                    ? '1px solid #333'
                    : '1px solid transparent',
                  background: isToday
                    ? 'linear-gradient(180deg, rgba(217,119,87,0.20), rgba(217,119,87,0.06))'
                    : isSelected
                    ? '#1f1f1f'
                    : 'transparent',
                  boxShadow: isToday ? '0 0 0 1px rgba(217,119,87,0.22), 0 0 24px rgba(217,119,87,0.20)' : 'none',
                }}
                onMouseEnter={e => { if (!isToday && !isSelected) (e.currentTarget as HTMLElement).style.background = '#1a1a1a' }}
                onMouseLeave={e => { if (!isToday && !isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: isToday ? 600 : 500,
                  color: isToday ? '#fff' : isOther ? 'var(--text-faint)' : isWeekend ? 'var(--text-2)' : 'var(--text)',
                  lineHeight: 1,
                }}>
                  {d.getDate()}
                </div>

                {!isOther && dayTasks.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px', overflow: 'hidden' }}>
                    {dayTasks.slice(0, 2).map((t, j) => (
                      <div key={j} style={{
                        fontSize: '10.5px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: j === 0 ? 'var(--accent-soft)' : 'rgba(120,120,120,0.08)',
                        color: j === 0 ? '#f0b899' : 'var(--text-2)',
                        borderLeft: `2px solid ${j === 0 ? 'var(--accent-2)' : '#555'}`,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.4,
                      }}>
                        {t.task_time ? `${t.task_time.slice(0, 5)} ` : ''}{t.title}
                      </div>
                    ))}
                    {count > 2 && (
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', paddingLeft: '6px' }}>
                        +{count - 2} more
                      </div>
                    )}
                  </div>
                )}

                {!isOther && count > 0 && dayTasks.length === 0 && (
                  <div style={{
                    position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)',
                    width: '4px', height: '4px', borderRadius: '50%',
                    background: 'var(--accent-2)',
                    boxShadow: '0 0 6px rgba(217,119,87,0.65)',
                  }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const dayCellBaseStyle: React.CSSProperties = {
  position: 'relative',
  borderRadius: '10px',
  padding: '8px 10px 6px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0,
  transition: 'all 0.15s',
}

const iconBtnStyle: React.CSSProperties = {
  width: '28px', height: '28px',
  borderRadius: '7px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
}

const todayPillStyle: React.CSSProperties = {
  fontSize: '11.5px',
  color: 'var(--text-2)',
  padding: '5px 10px',
  borderRadius: '7px',
  border: '1px solid #262626',
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
}
