import { useState, useMemo, useRef, useEffect } from 'react'
import type { Task } from '../services/supabase'
import { TASK_LABELS, parseLabelFromDescription } from '../services/supabase'
import { ChevronLeft, ChevronRight, IcoPlus } from './icons'
import { FEATURES } from '../config/features'

/**
 * Календарь в стиле Apple Calendar.
 *  • Month — сетка месяца с точками событий
 *  • 3 Days / Day — почасовая сетка
 * Прежний вариант экрана целиком сохранён в CalendarScreen.legacy.tsx.
 */

interface CalendarScreenProps {
  tasks: Record<string, (Task & { done: boolean })[]>
  onAdd: (date: Date, time?: string) => void
  onToggle: (dateKey: string, taskId: string) => void
  /** Больше не используется — оставлено для совместимости со старым экраном */
  onPopupChange?: (open: boolean) => void
}

type View = 'month' | '3d' | '1d'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const HOUR_H = 50

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

const toMins = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Недели месяца — ровно столько строк, сколько нужно (5 или 6) */
function buildMonthCells(anchor: Date): Date[] {
  const y = anchor.getFullYear()
  const m = anchor.getMonth()
  const startDow = (new Date(y, m, 1).getDay() + 6) % 7   // понедельник = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const weeks = Math.ceil((startDow + daysInMonth) / 7)
  const gridStart = new Date(y, m, 1 - startDow)
  return Array.from({ length: weeks * 7 }, (_, i) =>
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
}

/** Задачи дня: сначала без времени, затем по времени */
function sortDayTasks(list: (Task & { done: boolean })[]): (Task & { done: boolean })[] {
  return [...list].sort((a, b) => {
    const at = a.is_all_day ? '' : (a.task_time ?? '')
    const bt = b.is_all_day ? '' : (b.task_time ?? '')
    if (!at && !bt) return a.title.localeCompare(b.title)
    if (!at) return -1
    if (!bt) return 1
    return at.localeCompare(bt)
  })
}

/** Раскладка пересекающихся событий по колонкам */
function layoutDay(list: (Task & { done: boolean })[]) {
  const timed = list.filter(t => t.task_time && !t.is_all_day)
    .sort((a, b) => a.task_time!.localeCompare(b.task_time!))
  const slots = timed.map(t => ({
    id: t.id,
    start: toMins(t.task_time!),
    end: Math.max(
      t.task_time_end ? toMins(t.task_time_end) : toMins(t.task_time!) + 60,
      toMins(t.task_time!) + 30,
    ),
    col: 0,
  }))
  const colEnds: number[] = []
  for (const s of slots) {
    let placed = false
    for (let c = 0; c < colEnds.length; c++) {
      if (s.start >= colEnds[c]) { s.col = c; colEnds[c] = s.end; placed = true; break }
    }
    if (!placed) { s.col = colEnds.length; colEnds.push(s.end) }
  }
  const total = Math.max(1, colEnds.length)
  const map = new Map<string, { col: number; total: number; start: number; end: number }>()
  slots.forEach(s => map.set(s.id, { col: s.col, total, start: s.start, end: s.end }))
  return map
}

/* ─── Почасовая сетка (виды Day и 3 Days) ─── */
function TimeGrid({ days, tasks, onCellTap, onToggle }: {
  days: Date[]
  tasks: Record<string, (Task & { done: boolean })[]>
  onCellTap: (d: Date, hour: string) => void
  onToggle: (dateKey: string, taskId: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayKey = dayKey(new Date())
  const [now, setNow] = useState(() => new Date())
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(new Date().getHours() - 1, 0) * HOUR_H
    }
  }, [])

  return (
    <div className="tg">
      {/* Шапка с датами */}
      <div className="tg-head" style={{ gridTemplateColumns: `44px repeat(${days.length}, 1fr)` }}>
        <div />
        {days.map(d => {
          const isToday = dayKey(d) === todayKey
          return (
            <div key={dayKey(d)} className="tg-head-day">
              <span className="tg-head-dow">{SHORT_DAYS[d.getDay()].toUpperCase()}</span>
              <span className={`tg-head-num${isToday ? ' today' : ''}`}>{d.getDate()}</span>
            </div>
          )
        })}
      </div>

      {/* Задачи без времени */}
      {days.some(d => (tasks[dayKey(d)] || []).some(t => t.is_all_day || !t.task_time)) && (
        <div className="tg-allday" style={{ gridTemplateColumns: `44px repeat(${days.length}, 1fr)` }}>
          <span className="tg-allday-label">all-day</span>
          {days.map(d => {
            const dk = dayKey(d)
            return (
              <div key={dk} className="tg-allday-col">
                {(tasks[dk] || []).filter(t => t.is_all_day || !t.task_time).map(t => {
                  const c = TASK_LABELS[parseLabelFromDescription(t.description)].color
                  return (
                    <button
                      key={t.id}
                      className={`tg-chip${t.done ? ' done' : ''}`}
                      style={{ borderLeftColor: c, background: c + '1A' }}
                      onClick={() => onToggle(dk, t.id)}
                    >{t.title}</button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Часы */}
      <div className="tg-scroll" ref={scrollRef}>
        <div className="tg-body" style={{ gridTemplateColumns: `44px repeat(${days.length}, 1fr)` }}>
          <div className="tg-hours">
            {hours.map(h => (
              <div key={h} className="tg-hour-label" style={{ height: HOUR_H }}>
                {h > 0 && <span>{String(h).padStart(2, '0')}:00</span>}
              </div>
            ))}
          </div>

          {days.map(d => {
            const dk = dayKey(d)
            const dayTasks = tasks[dk] || []
            const layout = layoutDay(dayTasks)
            const isToday = dk === todayKey
            return (
              <div key={dk} className="tg-col">
                {hours.map(h => (
                  <div
                    key={h}
                    className="tg-cell"
                    style={{ height: HOUR_H }}
                    onClick={() => onCellTap(d, `${String(h).padStart(2, '0')}:00`)}
                  />
                ))}

                {dayTasks.filter(t => t.task_time && !t.is_all_day).map(t => {
                  const l = layout.get(t.id)
                  if (!l) return null
                  const c = TASK_LABELS[parseLabelFromDescription(t.description)].color
                  const top = (l.start / 60) * HOUR_H
                  const height = Math.max(((l.end - l.start) / 60) * HOUR_H - 2, 22)
                  return (
                    <button
                      key={`${t.id}-${dk}`}
                      className={`tg-event${t.done ? ' done' : ''}`}
                      onClick={() => onToggle(dk, t.id)}
                      style={{
                        top, height,
                        left: `calc(2px + (100% - 4px) / ${l.total} * ${l.col})`,
                        width: `calc((100% - 4px) / ${l.total})`,
                        background: c + '1F',
                        borderLeftColor: c,
                      }}
                    >
                      <span className="tg-event-title">{t.title}</span>
                      {height > 32 && <span className="tg-event-time">{t.task_time!.slice(0, 5)}</span>}
                    </button>
                  )
                })}

                {isToday && (
                  <div className="tg-now" style={{ top: (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_H }}>
                    <span className="tg-now-dot" />
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

/* ─── Строка события в списке дня ─── */
function EventRow({ task, onToggle }: {
  task: Task & { done: boolean }
  onToggle: () => void
}) {
  const color = TASK_LABELS[parseLabelFromDescription(task.description)].color
  const allDay = task.is_all_day || !task.task_time

  return (
    <button className="ac-row" onClick={onToggle}>
      <div className="ac-row-time">
        {allDay ? (
          <span className="ac-time-allday">all-day</span>
        ) : (
          <>
            <span className="ac-time-start">{task.task_time!.slice(0, 5)}</span>
            {task.task_time_end && (
              <span className="ac-time-end">{task.task_time_end.slice(0, 5)}</span>
            )}
          </>
        )}
      </div>
      <span className="ac-bar" style={{ background: task.done ? 'var(--text-faint)' : color }} />
      <div className="ac-row-body">
        <span className={`ac-row-title${task.done ? ' done' : ''}`}>{task.title}</span>
      </div>
      {task.done && (
        <svg className="ac-row-check" width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-faint)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </button>
  )
}

/* ─── Главный экран ─── */
export default function CalendarScreen({ tasks, onAdd, onToggle }: CalendarScreenProps) {
  const today = new Date()
  const todayKey = dayKey(today)

  const [view, setView] = useState<View>('month')
  const [anchor, setAnchor] = useState(() => new Date())        // месяц в виде Month
  const [selected, setSelected] = useState(() => new Date())    // выбранный день

  const cells = useMemo(() => buildMonthCells(anchor), [anchor])
  const selectedKey = dayKey(selected)
  const dayTasks = useMemo(() => sortDayTasks(tasks[selectedKey] || []), [tasks, selectedKey])
  const threeDays = useMemo(() => [selected, addDays(selected, 1), addDays(selected, 2)], [selected])
  const oneDay = useMemo(() => [selected], [selected])

  function navigate(dir: -1 | 1) {
    if (view === 'month') {
      setAnchor(a => new Date(a.getFullYear(), a.getMonth() + dir, 1))
    } else {
      setSelected(s => addDays(s, dir * (view === '3d' ? 3 : 1)))
    }
  }

  function goToday() {
    const now = new Date()
    setAnchor(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelected(now)
  }

  function pickDay(d: Date) {
    setSelected(d)
    if (d.getMonth() !== anchor.getMonth() || d.getFullYear() !== anchor.getFullYear()) {
      setAnchor(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }

  // Свайп по сетке месяца — листание месяцев
  const swipe = useRef<{ x: number; y: number } | null>(null)
  function onGridTouchStart(e: React.TouchEvent) {
    swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  function onGridTouchEnd(e: React.TouchEvent) {
    if (!swipe.current) return
    const dx = e.changedTouches[0].clientX - swipe.current.x
    const dy = e.changedTouches[0].clientY - swipe.current.y
    swipe.current = null
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) navigate(dx < 0 ? 1 : -1)
  }

  // Заголовок зависит от вида
  const title = view === 'month'
    ? { main: MONTHS[anchor.getMonth()], sub: String(anchor.getFullYear()) }
    : view === '1d'
      ? { main: `${selected.getDate()} ${MONTHS[selected.getMonth()].slice(0, 3)}`, sub: SHORT_DAYS[selected.getDay()] }
      : {
        main: `${selected.getDate()}–${addDays(selected, 2).getDate()} ${MONTHS[addDays(selected, 2).getMonth()].slice(0, 3)}`,
        sub: String(selected.getFullYear()),
      }

  const showToday = view === 'month'
    ? !(anchor.getFullYear() === today.getFullYear() && anchor.getMonth() === today.getMonth())
    : selectedKey !== todayKey

  const listHeading = selectedKey === todayKey
    ? 'Today'
    : selectedKey === dayKey(addDays(today, 1))
      ? 'Tomorrow'
      : `${FULL_DAYS[selected.getDay()]}, ${selected.getDate()} ${MONTHS[selected.getMonth()]}`

  return (
    <div className="ac-screen">
      {/* ── Заголовок ── */}
      <div className="ac-nav">
        <div className="ac-title">
          <span className="ac-title-month">{title.main}</span>
          <span className="ac-title-year">{title.sub}</span>
        </div>
        <div className="ac-nav-actions">
          {showToday && <button className="ac-today" onClick={goToday}>Today</button>}
          <button className="ac-icon-btn accent" onClick={() => onAdd(selected)} aria-label="New task">
            <IcoPlus size={19} />
          </button>
        </div>
      </div>

      {/* ── Переключатель вида + стрелки ── */}
      <div className="ac-toolbar">
        <div className="ac-seg">
          {([
            { id: 'month', label: 'Month' },
            { id: '3d', label: '3 Days' },
            { id: '1d', label: 'Day' },
          ] as const).map(v => (
            <button
              key={v.id}
              className={`ac-seg-pill${view === v.id ? ' on' : ''}`}
              onClick={() => setView(v.id)}
            >{v.label}</button>
          ))}
        </div>
        <div className="ac-arrows">
          <button className="ac-icon-btn" onClick={() => navigate(-1)} aria-label="Previous">
            <ChevronLeft size={16} />
          </button>
          <button className="ac-icon-btn" onClick={() => navigate(1)} aria-label="Next">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <>
          {/* ── Дни недели ── */}
          <div className="ac-head">
            {WD.map((d, i) => <span key={i}>{d}</span>)}
          </div>

          {/* ── Сетка месяца ── */}
          <div
            className={`ac-grid${FEATURES.calendarDayList ? '' : ' full'}`}
            onTouchStart={onGridTouchStart}
            onTouchEnd={onGridTouchEnd}
          >
            {cells.map((d, i) => {
              const dk = dayKey(d)
              const isOther = d.getMonth() !== anchor.getMonth()
              const dots = (tasks[dk] || [])
                .filter(t => !t.done)
                .slice(0, 3)
                .map(t => TASK_LABELS[parseLabelFromDescription(t.description)].color)

              return (
                <button
                  key={i}
                  className={`ac-day${dk === todayKey ? ' today' : ''}${dk === selectedKey ? ' sel' : ''}${isOther ? ' other' : ''}`}
                  onClick={() => pickDay(d)}
                >
                  <span className="ac-day-num">{d.getDate()}</span>
                  <span className="ac-dots">
                    {dots.map((c, j) => <span key={j} className="ac-dot" style={{ background: c }} />)}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Список выбранного дня — включается флагом calendarDayList ── */}
          {FEATURES.calendarDayList && (
            <div className="ac-list">
              <div className="ac-list-head">{listHeading}</div>
              {dayTasks.length === 0 ? (
                <div className="ac-empty">Nothing scheduled</div>
              ) : (
                dayTasks.map(t => (
                  <EventRow
                    key={`${t.id}-${selectedKey}`}
                    task={t}
                    onToggle={() => onToggle(selectedKey, t.id)}
                  />
                ))
              )}
            </div>
          )}
        </>
      ) : (
        <TimeGrid
          days={view === '3d' ? threeDays : oneDay}
          tasks={tasks}
          onCellTap={(d, h) => onAdd(d, h)}
          onToggle={onToggle}
        />
      )}
    </div>
  )
}
