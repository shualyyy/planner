import { format, isSameDay } from 'date-fns'
import { useTaskStore } from '../store/taskStore'

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

interface TodayTasksProps {
  selectedDate: Date
}

export default function TodayTasks({ selectedDate }: TodayTasksProps) {
  const { tasks, donIds, toggleDone } = useTaskStore()
  const today = new Date()
  const isToday = isSameDay(selectedDate, today)

  const dateKey = format(selectedDate, 'yyyy-MM-dd')
  const dayTasks = tasks.filter(t => t.task_date === dateKey)
  const completed = dayTasks.filter(t => donIds.has(t.id)).length
  const pct = dayTasks.length ? (completed / dayTasks.length) * 100 : 0

  const headerLabel = isToday ? 'Today' : format(selectedDate, 'EEEE')
  const subLabel = format(selectedDate, isToday ? 'EEEE, MMMM d, yyyy' : 'MMMM d, yyyy')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--panel)', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid var(--border-soft)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {headerLabel}
          </h2>
          {dayTasks.length > 0 && (
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              {completed}/{dayTasks.length}
            </span>
          )}
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
          {dayTasks.map((t, idx) => {
            const done = donIds.has(t.id)
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '11px',
                  padding: '12px 10px', borderRadius: '9px',
                  cursor: 'pointer', transition: 'background 0.15s',
                  borderTop: idx > 0 ? '1px solid var(--border-soft)' : 'none',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1a1a1a'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                onClick={() => toggleDone(t.id)}
              >
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
                    {t.title}
                  </div>
                  {t.task_time && (
                    <div style={{ marginTop: '5px' }}>
                      <span style={{
                        fontSize: '10.5px', padding: '2px 7px', borderRadius: '5px',
                        background: 'var(--accent-soft)', color: '#f0b899',
                        display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500,
                      }}>
                        <ClockIcon />{t.task_time.slice(0, 5)}
                      </span>
                    </div>
                  )}
                  {t.description && (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                      {t.description}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
