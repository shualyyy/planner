# Planer — Full Improvement Pass (v2)

## Context
React 18 + TypeScript + Vite PWA, iOS-first mobile app.  
Stack: Supabase + Zustand + Groq AI.  
Location: `~/Desktop/Planer`

Run `npm run build` before starting to get the baseline error count.  
Run `npm run build` again at the end — must complete with 0 errors.

---

## BUGS — Fix First

### B1 · HabitsSheet — старый цвет rgba в форме добавления
**File:** `src/components/HabitsSheet.tsx` line ~198

Replace:
```
border: '1.5px solid rgba(227,89,20,0.3)'
```
With:
```
border: '1.5px solid rgba(217,119,87,0.3)'
```

---

### B2 · taskStore — default theme должен быть dark
**File:** `src/store/taskStore.ts`

Change initial state `theme: 'light'` → `theme: 'dark'`.

Then, immediately after the `create<TaskStore>(...)` call (outside the store body), add:
```ts
useTaskStore.getState().setTheme('dark')
```
This ensures `data-theme="dark"` is set on `<html>` from the very first render.

---

### B3 · HabitsSheet — streak считается если ВСЕ привычки выполнены
**File:** `src/components/HabitsSheet.tsx`, функция `streak`

Current logic uses `habitLogs.some(l => l.completed_date === dk)` — засчитывает streak если хоть одна привычка выполнена.

Replace with:
```ts
const streak = (() => {
  if (habits.length === 0) return 0
  let s = 0
  const d = new Date(today)
  while (true) {
    const dk = dayKey(d)
    const allDone = habits.every(h =>
      habitLogs.some(l => l.habit_id === h.id && l.completed_date === dk)
    )
    if (allDone) { s++; d.setDate(d.getDate() - 1) }
    else break
  }
  return s
})()
```

---

## UX IMPROVEMENTS

### U1 · TasksScreen — секция Overdue перед Today
**File:** `src/components/TasksScreen.tsx`

Compute overdue tasks from `historyDays` (days before today with undone tasks):
```ts
const overdueTasks = historyDays.flatMap(dk =>
  (tasks[dk] || []).filter(t => !t.done).map(t => ({ ...t, task_date: dk }))
)
```

Render this block **above** the `activeDays.map(...)` section:
```tsx
{overdueTasks.length > 0 && (
  <div style={{ marginBottom: 24 }}>
    <div style={{
      font: '600 10px/1.2 var(--font-sans)', letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--danger)', marginBottom: 11,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
      Overdue
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {overdueTasks.map(t => (
        <TaskRow
          key={`overdue-${t.id}`}
          task={t}
          project={t.project_id ? projectMap[t.project_id] : undefined}
          onToggle={() => onToggle(t.task_date, t.id)}
          onDelete={() => onDelete(t.task_date, t.id)}
          onEdit={() => onEdit(t)}
        />
      ))}
    </div>
  </div>
)}
```

---

### U2 · TasksScreen — прогресс дня в заголовке
**File:** `src/components/TasksScreen.tsx`

Add before the return:
```ts
const todayTasks = tasks[todayKey] || []
const todayDone = todayTasks.filter(t => t.done).length
const todayTotal = todayTasks.length
```

Replace the header date block with:
```tsx
<div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
  <div style={{ font: '300 32px/1 var(--font-sans)', color: '#F0ECE3', letterSpacing: '-0.01em' }}>
    {format(today, 'EEEE')},<br />{format(today, 'd MMMM')}
  </div>
  {todayTotal > 0 && (
    <div style={{ textAlign: 'right', paddingBottom: 4 }}>
      {todayDone === todayTotal ? (
        <span style={{ font: '600 13px/1.2 var(--font-sans)', color: 'var(--success)' }}>All done ✓</span>
      ) : (
        <>
          <span style={{ font: '700 26px/1 var(--font-sans)', color: 'var(--accent)' }}>{todayDone}</span>
          <span style={{ font: '400 14px/1 var(--font-sans)', color: 'rgba(255,255,255,0.3)' }}>/{todayTotal}</span>
        </>
      )}
    </div>
  )}
</div>
```

---

### U3 · TasksScreen — opacity будущих задач 0.55 → 0.75
**File:** `src/components/TasksScreen.tsx`

Find the line with `opacity: isTomorrowOrLater ? 0.55 : 1` and change `0.55` to `0.75`.

---

### U4 · AssistantScreen — safe-area в нижнем отступе
**File:** `src/components/AssistantScreen.tsx`

Find `marginBottom: '90px'` in the composer wrapper and replace with:
```
marginBottom: 'calc(74px + env(safe-area-inset-bottom, 0px) + 16px)'
```

---

### U5 · AssistantScreen — quick-prompt чипы при пустом чате
**File:** `src/components/AssistantScreen.tsx`

Add this block between the messages list div and the composer div — shows only when no user messages sent yet:
```tsx
{messages.length === 1 && !loading && (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 18px 14px', flexShrink: 0 }}>
    {["What's today?", "Show overdue", "Add a task"].map(prompt => (
      <button
        key={prompt}
        onClick={() => handleSend(prompt)}
        style={{
          padding: '8px 14px', borderRadius: 999,
          background: 'var(--surface)', border: '1px solid var(--border)',
          color: 'var(--text-2)', font: '500 12px/1.2 var(--font-sans)',
          cursor: 'pointer', flexShrink: 0, letterSpacing: '-0.01em',
        }}
      >
        {prompt}
      </button>
    ))}
  </div>
)}
```

---

### U6 · AssistantScreen — SVG иконки в action bubbles (убрать emoji)
**File:** `src/components/AssistantScreen.tsx`

Replace the entire `ActionIcon` component with SVG-based version:
```tsx
function ActionIcon({ type }: { type: ParsedAction['type'] }) {
  const p = {
    width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'var(--accent)' as string, strokeWidth: '2',
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  switch (type) {
    case 'add':
      return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
    case 'delete':
      return <svg {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
    case 'reschedule':
      return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="17 13 13 17 11 15"/></svg>
    case 'done':
      return <svg {...p}><path d="M20 6L9 17l-5-5"/></svg>
    case 'undone':
      return <svg {...p}><path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 010 8h-1"/></svg>
    case 'edit':
      return <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    default:
      return <svg {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
  }
}
```

In `ActionBubble`, wrap the `<ActionIcon>` in a container:
```tsx
// Replace: <ActionIcon type={meta.type} />
// With:
<span style={{
  width: 24, height: 24, borderRadius: 7,
  background: 'var(--accent-soft)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}}>
  <ActionIcon type={meta.type} />
</span>
```

---

### U7 · HabitsSheet — emoji выбор иконки при создании привычки
**File:** `src/components/HabitsSheet.tsx`

Add constant:
```ts
const HABIT_EMOJIS = ['⭕', '🏃', '📚', '💧', '🧘', '💪', '🥗', '😴', '✍️', '🎯']
```

Add state alongside `newName` / `newColor`:
```ts
const [newEmoji, setNewEmoji] = useState('⭕')
```

In the add form, add emoji selector row **above** the color chips row:
```tsx
<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
  {HABIT_EMOJIS.map(e => (
    <button
      key={e}
      onClick={() => setNewEmoji(e)}
      style={{
        width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
        fontSize: 16, lineHeight: 1,
        background: newEmoji === e ? 'var(--accent-soft)' : 'rgba(255,255,255,0.06)',
        outline: newEmoji === e ? `1.5px solid var(--accent)` : 'none',
        outlineOffset: 1,
        transition: 'background 0.12s, outline 0.12s',
      }}
    >{e}</button>
  ))}
</div>
```

Pass `newEmoji` as `icon` in `handleSave`:
```ts
await addHabit({ name: newName.trim(), icon: newEmoji, color: newColor, frequency: 'daily', time_of_day: 'morning' })
```

Reset after save:
```ts
setNewEmoji('⭕')
```

In the habit card, replace the SVG circle with the stored emoji:
```tsx
// Replace the svg circle icon wrapper with:
<div style={{
  width: 34, height: 34, borderRadius: 9,
  background: h.color + '26',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, fontSize: 18, lineHeight: 1,
}}>
  {h.icon && h.icon !== 'circle' ? h.icon : '⭕'}
</div>
```

---

### U8 · Swipe-down to close шторки (HabitsSheet + HistorySheet)
**File:** `src/components/HabitsSheet.tsx` and `src/components/TasksScreen.tsx` (HistorySheet)

Add this logic to **both** sheets.

For `HabitsSheet`, add refs and state at the top of the component:
```ts
const dragStartY = useRef(0)
const [dragY, setDragY] = useState(0)
const [isDragging, setIsDragging] = useState(false)
```

Add handlers:
```ts
function onSheetDragStart(e: React.TouchEvent) {
  dragStartY.current = e.touches[0].clientY
  setIsDragging(true)
}
function onSheetDragMove(e: React.TouchEvent) {
  const dy = Math.max(0, e.touches[0].clientY - dragStartY.current)
  setDragY(dy)
}
function onSheetDragEnd() {
  setIsDragging(false)
  if (dragY > 100) { setDragY(0); onClose() }
  else setDragY(0)
}
```

Apply to the inner sheet div (the white/dark panel, not the backdrop):
```tsx
onTouchStart={onSheetDragStart}
onTouchMove={onSheetDragMove}
onTouchEnd={onSheetDragEnd}
style={{
  ...existingStyles,
  transform: `translateY(${dragY}px)`,
  transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
}}
```

Apply the same pattern to `HistorySheet` inside `TasksScreen.tsx`.

---

### U9 · CalendarScreen — кнопка Today в расширенном виде
**File:** `src/components/CalendarScreen.tsx`

Find the expanded calendar (`cal-expanded`) header section.

Add a `useRef` for the today cell:
```ts
const todayCellRef = useRef<HTMLButtonElement | null>(null)
```

Attach the ref to the `.d-exp` button that has class `today-exp`:
```tsx
ref={isToday ? todayCellRef : undefined}
```

Add a "Today" button in the expanded calendar header (next to the month title or close button):
```tsx
<button
  onClick={() => todayCellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
  style={{
    padding: '5px 13px', borderRadius: 999,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-2)',
    font: '500 12px/1.2 var(--font-sans)',
    cursor: 'pointer',
  }}
>
  Today
</button>
```

---

## FINAL VERIFICATION

After all changes are applied:

1. `npm run build` — **0 TypeScript errors**
2. Color scan — **0 matches**:
   ```bash
   grep -rn '#e35914\|rgba(227,89,20\|#111118\|#16161E\|#0A0A0F\|#1C1C26' src/
   ```
3. Russian text scan — **0 matches**:
   ```bash
   grep -rn 'Добавить\|Отмена\|Сохранить\|Задач\|Привычк\|Проект' src/components/
   ```
4. Theme check: `taskStore.ts` has `theme: 'dark'` and calls `setTheme('dark')` on init
5. Streak check: `HabitsSheet.tsx` streak uses `habits.every(...)` not `habitLogs.some(...)`
6. Quick-chips check: `AssistantScreen.tsx` shows 3 chips when `messages.length === 1`

---

## DO NOT TOUCH

- Supabase schema, tables, RLS policies
- `supabase/functions/chat/index.ts`
- Auth flow: `LoginPage.tsx`, `App.tsx`, `useAuthForm.ts`
- Recurring task logic in `taskStore.ts` (groupTasksByDay)
- Any CSS token values in `index.css` — they are already correct
- `src/components/ProjectsScreen.tsx` — skip unless TypeScript forces a fix
