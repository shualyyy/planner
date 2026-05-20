import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Task } from '../services/supabase'
import { TASK_LABELS, parseLabelFromDescription } from '../services/supabase'
import { ChevronLeft, ChevronRight } from './icons'

interface CalendarScreenProps {
  tasks: Record<string, (Task & { done: boolean })[]>
  onAdd: (date: Date, time?: string) => void
  onToggle: (dateKey: string, taskId: string) => void
  onPopupChange?: (open: boolean) => void
}

type View = '30d' | '3d' | '1d'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const WD = ['M','T','W','T','F','S','S']

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

/* ─── DayPopup ─── */
function DayPopup({ date, tasks, onClose, onToggle, onAdd }: {
  date: Date
  tasks: (Task & { done: boolean })[]
  onClose: () => void
  onToggle: (taskId: string) => void
  onAdd: () => void
}) {
  const monthAbbr = MONTHS[date.getMonth()].slice(0,3).toUpperCase()

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'var(--bg)',
          borderRadius: '28px 28px 0 0',
          padding: '16px 24px 24px',
          boxShadow: 'var(--sheet-shadow)',
          maxHeight: '75vh', overflowY: 'auto',
        }}
      >
        <div style={{ width: '40px', height: '5px', borderRadius: '999px', background: 'var(--border)', margin: '0 auto 20px' }} />

        {/* Sheet heading */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '36px', fontWeight: 500, color: 'var(--text)', lineHeight: 1 }}>
            {date.getDate()}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
            {SHORT_DAYS[date.getDay()].toUpperCase()} · {monthAbbr}
          </span>
        </div>

        {/* Tasks */}
        {tasks.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0 16px' }}>Nothing scheduled.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '12px' }}>
            {tasks.map(t => {
              const label = parseLabelFromDescription(t.description)
              const lc = TASK_LABELS[label].color
              return (
                <div
                  key={t.id}
                  onClick={() => onToggle(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', borderRadius: '14px',
                    cursor: 'pointer', background: 'var(--surface)',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    border: t.done ? 'none' : '1.5px solid var(--border)',
                    background: t.done ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {t.done && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px', fontWeight: 500, color: t.done ? 'var(--text-muted)' : 'var(--text)',
                      textDecoration: t.done ? 'line-through' : 'none',
                    }}>{t.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: lc, flexShrink: 0 }} />
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{TASK_LABELS[label].name}</span>
                      {t.task_time && <><span style={{ color: 'var(--text-faint)' }}>·</span><span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{t.task_time.slice(0,5)}</span></>}
                    </div>
                  </div>
                  {t.task_time && !t.done && (
                    <span style={{ fontSize: '11.5px', fontWeight: 550, padding: '4px 9px', borderRadius: '999px', background: 'var(--surface2)', color: 'var(--text-2)', flexShrink: 0 }}>
                      {t.task_time.slice(0,5)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={onAdd}
          style={{
            width: '100%', height: '52px', borderRadius: '18px', border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: '15px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 24px var(--accent-glow)',
          }}
        >+ Add task</button>
      </div>
    </div>,
    document.body
  )
}

/* ─── Calendar30 ─── */
function Calendar30({ anchor, tasks, onDayTap }: {
  anchor: Date
  tasks: Record<string, (Task & { done: boolean })[]>
  onDayTap: (d: Date) => void
}) {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDow = (firstDay.getDay() + 6) % 7
  const todayKey = dayKey(new Date())

  const cells: Date[] = []
  const gridStart = new Date(year, month, 1 - startDow)
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  }

  return (
    <div className="cal-body">
      {/* Weekday headers */}
      <div className="weekdays">
        {WD.map((d, i) => <div key={i} className="wd">{d}</div>)}
      </div>
      {/* Day grid */}
      <div className="days30">
        {cells.map((d, i) => {
          const dk = dayKey(d)
          const isToday = dk === todayKey
          const isOther = d.getMonth() !== month
          const dayTasks = isOther ? [] : (tasks[dk] || [])
          const dotColors = dayTasks
            .filter(t => !t.done)
            .slice(0, 3)
            .map(t => TASK_LABELS[parseLabelFromDescription(t.description)].color)

          return (
            <button
              key={i}
              className={`d30${isToday ? ' today' : ''}${isOther ? ' other' : ''}`}
              onClick={() => !isOther && onDayTap(d)}
            >
              <span className="d-num">{d.getDate()}</span>
              {dotColors.length > 0 && (
                <div className="d-dots">
                  {dotColors.map((c, j) => (
                    <div key={j} className="d-dot" style={{ background: c }} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Upcoming section ─── */
function UpcomingSection({ tasks, onAdd }: {
  tasks: Record<string, (Task & { done: boolean })[]>
  onAdd: (date: Date, time?: string) => void
}) {
  const todayKey = dayKey(new Date())

  const upcoming = useMemo(() => {
    const flat = Object.values(tasks).flat()
    return flat
      .filter(t => !t.done && t.task_time && t.task_date >= todayKey)
      .sort((a, b) => {
        const da = a.task_date + (a.task_time || '')
        const db = b.task_date + (b.task_time || '')
        return da.localeCompare(db)
      })
  }, [tasks, todayKey])

  return (
    <div style={{ padding: '20px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Up next</span>
        <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          {upcoming.length} event{upcoming.length !== 1 ? 's' : ''}
        </span>
      </div>

      {upcoming.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>Nothing coming up. Enjoy the quiet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {upcoming.map(t => {
            const d = new Date(t.task_date + 'T12:00:00')
            const label = parseLabelFromDescription(t.description)
            const lc = TASK_LABELS[label].color
            return (
              <div
                key={t.id}
                onClick={() => onAdd(d, t.task_time || undefined)}
                style={{
                  background: 'var(--surface)', borderRadius: '16px', padding: '14px',
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                  boxShadow: 'var(--card-shadow)', cursor: 'pointer',
                }}
              >
                {/* Date column */}
                <div style={{ width: '38px', flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 500, color: 'var(--text)', lineHeight: 1 }}>
                    {d.getDate()}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {SHORT_DAYS[d.getDay()]}
                  </div>
                </div>
                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>{t.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: lc }} />
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{TASK_LABELS[label].name}</span>
                    <span style={{ color: 'var(--text-faint)' }}>·</span>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{t.task_time!.slice(0,5)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── TimeGrid ─── */
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
      scrollRef.current.scrollTop = Math.max(now.getHours() - 2, 0) * hourHeight
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${days.length}, 1fr)`, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div />
        {days.map(d => {
          const dk = dayKey(d)
          const isToday = dk === todayKey
          return (
            <div key={dk} style={{ textAlign: 'center', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                {SHORT_DAYS[d.getDay()]}
              </span>
              <span style={{
                fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 500,
                color: isToday ? 'var(--bg)' : 'var(--text)',
                width: '30px', height: '30px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isToday ? 'var(--text)' : 'transparent',
              }}>{d.getDate()}</span>
            </div>
          )
        })}
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto',  }}>
        <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${days.length}, 1fr)` }}>
          <div>
            {hours.map(h => (
              <div key={h} style={{ height: `${hourHeight}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '2px' }}>
                {h > 0 && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{String(h).padStart(2,'0')}:00</span>}
              </div>
            ))}
          </div>
          {days.map(d => {
            const dk = dayKey(d)
            const isToday = dk === todayKey
            const dayTasks = tasks[dk] || []
            return (
              <div key={dk} style={{ position: 'relative', borderLeft: '1px solid var(--hairline)' }}>
                {hours.map(h => (
                  <div key={h} onClick={() => onCellTap(d, `${String(h).padStart(2,'0')}:00`)}
                    style={{ height: `${hourHeight}px`, borderBottom: '1px solid var(--hairline)', cursor: 'pointer' }} />
                ))}
                {dayTasks.filter(t => t.task_time).map(t => {
                  const [hh, mm] = t.task_time!.split(':').map(Number)
                  const top = hh * hourHeight + (mm / 60) * hourHeight
                  const label = parseLabelFromDescription(t.description)
                  return (
                    <div key={t.id} style={{
                      position: 'absolute', left: '2px', right: '2px', top: `${top}px`, height: '56px',
                      background: TASK_LABELS[label].color, borderRadius: '10px',
                      padding: '4px 8px', overflow: 'hidden', opacity: t.done ? 0.5 : 1,
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ev-ink)', lineHeight: 1.3 }}>{t.title}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.45)', marginTop: '1px' }}>{t.task_time!.slice(0,5)}</div>
                    </div>
                  )
                })}
                {isToday && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: `${now.getHours() * hourHeight + (now.getMinutes() / 60) * hourHeight}px`, height: '2px', background: 'var(--danger)', zIndex: 5 }}>
                    <div style={{ position: 'absolute', left: '-3px', top: '-3px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)' }} />
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

/* ─── Main ─── */
export default function CalendarScreen({ tasks, onAdd, onToggle, onPopupChange }: CalendarScreenProps) {
  const [view, setView] = useState<View>('30d')
  const [anchor, setAnchor] = useState(new Date())
  const [popupDate, setPopupDate] = useState<Date | null>(null)

  function openPopup(d: Date) { setPopupDate(d); onPopupChange?.(true) }
  function closePopup() { setPopupDate(null); onPopupChange?.(false) }

  const popupKey = popupDate ? dayKey(popupDate) : ''
  const popupTasks = popupDate ? (tasks[popupKey] || []) : []

  const title = useMemo(() => {
    if (view === '30d') return { month: MONTHS[anchor.getMonth()], year: anchor.getFullYear() }
    if (view === '1d') {
      const dk = dayKey(anchor)
      const todayK = dayKey(new Date())
      return { month: dk === todayK ? 'Today' : `${SHORT_DAYS[anchor.getDay()]}, ${anchor.getDate()} ${MONTHS[anchor.getMonth()].slice(0,3)}`, year: '' }
    }
    const start = addDays(anchor, -1), end = addDays(anchor, 1)
    return { month: `${SHORT_DAYS[start.getDay()]} ${start.getDate()} – ${SHORT_DAYS[end.getDay()]} ${end.getDate()}`, year: '' }
  }, [view, anchor])

  function navigate(dir: -1 | 1) {
    if (view === '30d') setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1))
    else if (view === '3d') setAnchor(addDays(anchor, dir * 3))
    else setAnchor(addDays(anchor, dir))
  }

  const threeDays = useMemo(() => [addDays(anchor, -1), anchor, addDays(anchor, 1)], [anchor])
  const oneDay = useMemo(() => [anchor], [anchor])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '6px 24px 8px', flexShrink: 0 }}>
        {/* Eyebrow row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
            {view === '30d' ? 'This month' : view === '3d' ? '3 days' : 'Day view'}
          </span>
          <div className="seg">
            {(['30d','3d','1d'] as View[]).map(v => (
              <button key={v} className={`seg-pill${view === v ? ' on' : ''}`} onClick={() => { setView(v); setAnchor(new Date()) }}>{v}</button>
            ))}
          </div>
        </div>
        {/* Month row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 500, color: 'var(--text)', lineHeight: 1 }}>{title.month}</span>
            {title.year !== '' && <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>{title.year}</span>}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => navigate(-1)} style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', transition: 'all 0.15s' }}>
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => navigate(1)} style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', transition: 'all 0.15s' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar body */}
      {view === '30d' && (
        <>
          {/* Calendar grid — fixed, does not scroll */}
          <div style={{ flexShrink: 0 }}>
            <Calendar30 anchor={anchor} tasks={tasks} onDayTap={d => openPopup(d)} />
          </div>
          {/* Upcoming — scrollable, fills remaining space */}
          <div style={{ flex: 1, overflowY: 'auto',  }}>
            <UpcomingSection tasks={tasks} onAdd={onAdd} />
          </div>
        </>
      )}
      {view === '3d' && <TimeGrid days={threeDays} tasks={tasks} onCellTap={(d, t) => onAdd(d, t)} />}
      {view === '1d' && <TimeGrid days={oneDay} tasks={tasks} onCellTap={(d, t) => onAdd(d, t)} />}

      {popupDate && (
        <DayPopup
          date={popupDate}
          tasks={popupTasks}
          onClose={() => closePopup()}
          onToggle={id => onToggle(popupKey, id)}
          onAdd={() => { onAdd(popupDate); closePopup() }}
        />
      )}
    </div>
  )
}
