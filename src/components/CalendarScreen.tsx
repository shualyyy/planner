import { useState, useMemo, useRef } from 'react'
import type { Task } from '../services/supabase'
import { TASK_LABELS, parseLabelFromDescription } from '../services/supabase'
import { ChevronLeft, ChevronRight, IcoPlus } from './icons'
import { FEATURES } from '../config/features'

/**
 * Календарь в стиле Apple Calendar: сетка месяца сверху, список задач
 * выбранного дня снизу. Прошлый вариант (30d / 3d / 1d, TimeGrid,
 * DayPopup, полноэкранный месяц) сохранён в CalendarScreen.legacy.tsx.
 */

interface CalendarScreenProps {
  tasks: Record<string, (Task & { done: boolean })[]>
  onAdd: (date: Date, time?: string) => void
  onToggle: (dateKey: string, taskId: string) => void
  /** Больше не используется — оставлено для совместимости со старым экраном */
  onPopupChange?: (open: boolean) => void
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
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

/* ─── Одна строка события ─── */
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

  const [anchor, setAnchor] = useState(() => new Date())        // отображаемый месяц
  const [selected, setSelected] = useState(() => new Date())    // выбранный день

  const cells = useMemo(() => buildMonthCells(anchor), [anchor])
  const selectedKey = dayKey(selected)
  const dayTasks = useMemo(() => sortDayTasks(tasks[selectedKey] || []), [tasks, selectedKey])

  function goMonth(dir: -1 | 1) {
    setAnchor(a => new Date(a.getFullYear(), a.getMonth() + dir, 1))
  }

  function goToday() {
    const now = new Date()
    setAnchor(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelected(now)
  }

  function pickDay(d: Date) {
    setSelected(d)
    // тап по «хвосту» соседнего месяца — переходим в этот месяц
    if (d.getMonth() !== anchor.getMonth() || d.getFullYear() !== anchor.getFullYear()) {
      setAnchor(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }

  // Свайп по сетке — листание месяцев
  const swipe = useRef<{ x: number; y: number } | null>(null)
  function onGridTouchStart(e: React.TouchEvent) {
    swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  function onGridTouchEnd(e: React.TouchEvent) {
    if (!swipe.current) return
    const dx = e.changedTouches[0].clientX - swipe.current.x
    const dy = e.changedTouches[0].clientY - swipe.current.y
    swipe.current = null
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) goMonth(dx < 0 ? 1 : -1)
  }

  const isCurrentMonth = anchor.getFullYear() === today.getFullYear() && anchor.getMonth() === today.getMonth()

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
          <span className="ac-title-month">{MONTHS[anchor.getMonth()]}</span>
          <span className="ac-title-year">{anchor.getFullYear()}</span>
        </div>
        <div className="ac-nav-actions">
          {!isCurrentMonth && (
            <button className="ac-today" onClick={goToday}>Today</button>
          )}
          <button className="ac-icon-btn" onClick={() => goMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={17} />
          </button>
          <button className="ac-icon-btn" onClick={() => goMonth(1)} aria-label="Next month">
            <ChevronRight size={17} />
          </button>
          <button className="ac-icon-btn accent" onClick={() => onAdd(selected)} aria-label="New task">
            <IcoPlus size={19} />
          </button>
        </div>
      </div>

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
    </div>
  )
}
