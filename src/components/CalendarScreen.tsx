import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Task } from '../services/supabase'
import { ChevronLeft, ChevronRight } from './icons'

interface CalendarScreenProps {
  tasks: Record<string, (Task & { done: boolean })[]>
  onAdd: (date: Date, time?: string) => void
  onToggle: (dateKey: string, taskId: string) => void
  onPopupChange?: (open: boolean) => void
}

type View = '30d' | '3d' | '1d'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

const evColor = (id: string): string => {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return `var(--ev-${n % 6})`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/* ─── Segment Pills ─── */
function SegmentPills({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const opts: View[] = ['30d', '3d', '1d']
  return (
    <div className="seg">
      {opts.map(v => (
        <button key={v} className={`seg-pill${view === v ? ' on' : ''}`} onClick={() => onChange(v)}>
          {v}
        </button>
      ))}
    </div>
  )
}

/* ─── DayPopup ─── */
function DayPopup({ date, tasks, onClose, onToggle, onAdd }: {
  date: Date
  tasks: (Task & { done: boolean })[]
  onClose: () => void
  onToggle: (taskId: string) => void
  onAdd: () => void
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'var(--surface)', borderRadius: '20px 20px 0 0',
          padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)',
          maxHeight: '70vh', overflowY: 'auto',
        }}
      >
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border)', margin: '0 auto 16px' }} />
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
          {SHORT_DAYS[date.getDay()]}, {MONTHS[date.getMonth()]} {date.getDate()}
        </div>

        {tasks.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>No tasks this day</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {tasks.map(t => (
              <div
                key={t.id}
                onClick={() => onToggle(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', borderRadius: '10px',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                  border: t.done ? 'none' : '1.5px solid var(--border)',
                  background: t.done ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {t.done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px', fontWeight: 450, color: t.done ? 'var(--text-muted)' : 'var(--text)',
                    textDecoration: t.done ? 'line-through' : 'none',
                  }}>{t.title}</div>
                </div>
                {t.task_time && (
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                    background: 'var(--accent-soft)', color: 'var(--accent)',
                    fontWeight: 500, flexShrink: 0,
                  }}>{t.task_time.slice(0,5)}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onAdd}
          style={{
            marginTop: '12px', width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
          }}
        >+ Add task</button>
      </div>
    </div>
  )
}

/* ─── Calendar30 (Month view) ─── */
function Calendar30({ anchor, tasks, onDayTap }: {
  anchor: Date
  tasks: Record<string, (Task & { done: boolean })[]>
  onDayTap: (d: Date) => void
}) {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDow = (firstDay.getDay() + 6) % 7 // Monday=0

  // Full 42-cell grid including adjacent month days
  const cells: Date[] = []
  const gridStart = new Date(year, month, 1 - startDow)
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  }

  const todayKey = dayKey(new Date())

  return (
    <div className="cal-body">
      <div className="weekdays">
        {WEEKDAYS.map((d, i) => <div key={i} className="wd">{d}</div>)}
      </div>
      <div className="days30">
        {cells.map((d, i) => {
          const dk = dayKey(d)
          const isToday = dk === todayKey
          const isOtherMonth = d.getMonth() !== month
          const dayTasks = isOtherMonth ? [] : (tasks[dk] || [])
          return (
            <div
              key={i}
              className={`d30${isToday ? ' today' : ''}${isOtherMonth ? ' other' : ''}`}
              onClick={() => !isOtherMonth && onDayTap(d)}
            >
              <div className="d-num">{d.getDate()}</div>
              {dayTasks.length > 0 && (
                <div className="d-chips">
                  {dayTasks.slice(0, 4).map(t => (
                    <div key={t.id} className="d-chip" style={{ background: evColor(t.id) }}>
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 4 && (
                    <div className="d-more">+{dayTasks.length - 4}</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── TimeGrid (shared by 3d and 1d) ─── */
function TimeGrid({ days, tasks, onCellTap }: {
  days: Date[]
  tasks: Record<string, (Task & { done: boolean })[]>
  onCellTap: (d: Date, hour: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayKey = dayKey(new Date())
  const now = new Date()
  const hourHeight = 64

  useEffect(() => {
    if (scrollRef.current) {
      const curHour = Math.max(now.getHours() - 2, 0)
      scrollRef.current.scrollTop = curHour * hourHeight
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `40px repeat(${days.length}, 1fr)`,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div />
        {days.map(d => {
          const dk = dayKey(d)
          const isToday = dk === todayKey
          return (
            <div key={dk} style={{
              textAlign: 'center', padding: '8px 4px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>
                {SHORT_DAYS[d.getDay()]}
              </span>
              <span style={{
                fontSize: '16px', fontWeight: isToday ? 600 : 500,
                color: isToday ? 'var(--accent)' : 'var(--text)',
                width: '28px', height: '28px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isToday ? 'var(--accent-soft)' : 'transparent',
              }}>{d.getDate()}</span>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', position: 'relative', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `40px repeat(${days.length}, 1fr)`,
          position: 'relative',
        }}>
          {/* Time labels */}
          <div>
            {hours.map(h => (
              <div key={h} style={{ height: `${hourHeight}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '2px' }}>
                {h > 0 && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {String(h).padStart(2, '0')}:00
                </span>}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(d => {
            const dk = dayKey(d)
            const isToday = dk === todayKey
            const dayTasks = tasks[dk] || []
            return (
              <div key={dk} style={{ position: 'relative', borderLeft: '1px solid var(--border)' }}>
                {/* Hour cells */}
                {hours.map(h => (
                  <div
                    key={h}
                    onClick={() => onCellTap(d, `${String(h).padStart(2, '0')}:00`)}
                    style={{
                      height: `${hourHeight}px`,
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  />
                ))}

                {/* Events */}
                {dayTasks.filter(t => t.task_time).map(t => {
                  const [hh, mm] = (t.task_time!).split(':').map(Number)
                  const top = hh * hourHeight + (mm / 60) * hourHeight
                  return (
                    <div key={t.id} style={{
                      position: 'absolute', left: '2px', right: '2px',
                      top: `${top}px`, height: '56px',
                      background: evColor(t.id), borderRadius: '10px',
                      padding: '4px 8px', overflow: 'hidden',
                      opacity: t.done ? 0.5 : 1,
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 500, color: '#1C1917', lineHeight: 1.3 }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)', marginTop: '1px' }}>
                        {t.task_time!.slice(0, 5)}
                      </div>
                    </div>
                  )
                })}

                {/* Now line */}
                {isToday && (
                  <div style={{
                    position: 'absolute', left: 0, right: 0,
                    top: `${now.getHours() * hourHeight + (now.getMinutes() / 60) * hourHeight}px`,
                    height: '2px', background: 'var(--danger)',
                    zIndex: 5,
                  }}>
                    <div style={{
                      position: 'absolute', left: '-3px', top: '-3px',
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: 'var(--danger)',
                    }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Main CalendarScreen ─── */
export default function CalendarScreen({ tasks, onAdd, onToggle, onPopupChange }: CalendarScreenProps) {
  const [view, setView] = useState<View>('30d')
  const [anchor, setAnchor] = useState(new Date())
  const [popupDate, setPopupDate] = useState<Date | null>(null)

  const popupKey = popupDate ? dayKey(popupDate) : ''
  const popupTasks = popupDate ? (tasks[popupKey] || []) : []

  function openPopup(date: Date) {
    setPopupDate(date)
    onPopupChange?.(true)
  }

  function closePopup() {
    setPopupDate(null)
    onPopupChange?.(false)
  }

  const title = useMemo(() => {
    if (view === '30d') return MONTHS[anchor.getMonth()] + ' ' + anchor.getFullYear()
    if (view === '1d') {
      const dk = dayKey(anchor)
      const todayK = dayKey(new Date())
      if (dk === todayK) return 'Today'
      return `${SHORT_DAYS[anchor.getDay()]}, ${MONTHS[anchor.getMonth()]} ${anchor.getDate()}`
    }
    // 3d
    const start = addDays(anchor, -1)
    const end = addDays(anchor, 1)
    return `${SHORT_DAYS[start.getDay()]} ${start.getDate()} – ${SHORT_DAYS[end.getDay()]} ${end.getDate()}`
  }, [view, anchor])

  function navigate(dir: -1 | 1) {
    if (view === '30d') {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1))
    } else if (view === '3d') {
      setAnchor(addDays(anchor, dir * 3))
    } else {
      setAnchor(addDays(anchor, dir))
    }
  }

  const threeDays = useMemo(() => [addDays(anchor, -1), anchor, addDays(anchor, 1)], [anchor])
  const oneDay = useMemo(() => [anchor], [anchor])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 74px)' }}>
      {/* Topbar */}
      <div style={{
        padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => navigate(-1)} style={navBtnStyle}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)' }}>{title}</span>
          <button onClick={() => navigate(1)} style={navBtnStyle}>
            <ChevronRight size={16} />
          </button>
        </div>
        <SegmentPills view={view} onChange={v => { setView(v); setAnchor(new Date()) }} />
      </div>


      {/* Calendar body */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {view === '30d' && (
          <Calendar30 anchor={anchor} tasks={tasks} onDayTap={d => openPopup(d)} />
        )}
        {view === '3d' && (
          <TimeGrid days={threeDays} tasks={tasks} onCellTap={(d, time) => onAdd(d, time)} />
        )}
        {view === '1d' && (
          <TimeGrid days={oneDay} tasks={tasks} onCellTap={(d, time) => onAdd(d, time)} />
        )}
      </div>

      {/* DayPopup — rendered via portal into body to avoid iOS fixed-in-fixed issues */}
      {popupDate && createPortal(
        <DayPopup
          date={popupDate}
          tasks={popupTasks}
          onClose={closePopup}
          onToggle={id => onToggle(popupKey, id)}
          onAdd={() => { onAdd(popupDate); closePopup() }}
        />,
        document.body
      )}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-muted)', padding: '6px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: '8px', WebkitTapHighlightColor: 'transparent',
  transition: 'color 0.15s',
}
