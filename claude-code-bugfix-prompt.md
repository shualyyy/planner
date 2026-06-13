# Claude Code — Bug Hunt & Fix: Dino Task Planner

## Project
React 18 + TypeScript + Vite PWA, iOS-first. Supabase backend. Zustand state.
Repo: https://github.com/shualyyy/planner

## Stack
- `src/store/taskStore.ts` — Zustand store, `groupTasksByDay()` for recurring expansion
- `src/services/supabase.ts` — Supabase client, Task type, label helpers
- `src/components/AddTaskModal.tsx` — bottom sheet form for add/edit
- `src/components/TasksScreen.tsx` — task list with pinned goals + history sheet
- `src/components/CalendarScreen.tsx` — 30d / 3d / 1d views, TimeGrid with overlap layout
- `src/components/AssistantScreen.tsx` — AI chat with Groq, SpeechRecognition
- `src/components/NotesScreen.tsx` — local Zustand notes, masonry grid
- `src/components/MobileApp.tsx` — shell, portal tab bar, FAB, AddTaskModal host
- `src/index.css` — all design tokens and component classes

## TypeScript check
Run `npx tsc --noEmit` — currently passes clean. Keep it passing after all fixes.

---

## Known bugs to find and fix

### BUG 1 — CRITICAL: Edit task resets `is_done` to false
**File:** `src/components/AddTaskModal.tsx`
**Function:** `handleSubmit()`
**Problem:** The `payload` object hardcodes `is_done: false as const` for both add AND edit modes.
When a user edits an already-completed task, saving it silently un-completes it in Supabase.
**Fix:** In edit mode, preserve the original `is_done` value:
```typescript
is_done: isEditMode ? (editTask?.is_done ?? false) : false,
```

### BUG 2 — HIGH: Pinned tasks `daysLeft` timezone off-by-one
**File:** `src/components/TasksScreen.tsx`
**Function:** `pinnedTasks` useMemo, line with `new Date(t.pin_end)`
**Problem:** `new Date('2024-01-15')` parses as UTC midnight (00:00 UTC). On any timezone
behind UTC (e.g. Moscow UTC+3, but also for any browser that interprets dates differently),
this can cause daysLeft to be -1 when it should be 0, or 0 when it should be 1.
**Fix:** Parse with local noon to avoid UTC boundary crossing:
```typescript
const daysLeft = t.pin_end
  ? Math.ceil((new Date(t.pin_end + 'T12:00:00').getTime() - Date.now()) / 86400000)
  : null
```

### BUG 3 — HIGH: React key collision for recurring tasks in TasksScreen
**File:** `src/components/TasksScreen.tsx`
**Functions:** `renderDayGroup()` and `HistorySheet` component
**Problem:** Both use `key={t.id}` when rendering task rows. Since `groupTasksByDay()`
generates virtual recurring instances that share the same `id` (intentional for shared
done-state), if the same recurring task somehow appears twice in one day group (edge case),
React will warn about duplicate keys and render incorrectly.
**Also:** In `HistorySheet`, the same `key={t.id}` is used — same risk.
**Fix:** Use composite key `${t.id}-${t.task_date}` everywhere task rows are mapped:
```tsx
// In renderDayGroup:
<div key={`${t.id}-${dk}`}>
// In HistorySheet:
<div key={`${t.id}-${dk}`}>
```

### BUG 4 — MEDIUM: Race condition in AddTaskModal reset vs. populate
**File:** `src/components/AddTaskModal.tsx`
**Problem:** There are two competing `useEffect`s:
1. When `isOpen` becomes false → schedules a reset after 300ms (to allow close animation)
2. When `isOpen` becomes true + `editTask` is set → populates fields immediately

If the modal is closed and re-opened within 300ms (e.g., user taps a task quickly),
the reset timer fires AFTER the populate effect, wiping all edit fields.

**Fix:** Add a cleanup to the populate effect that cancels any pending reset timer.
Use a ref to track the timer:
```typescript
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// In the reset effect:
useEffect(() => {
  if (!isOpen) {
    resetTimerRef.current = setTimeout(() => {
      setTitle(''); setTime(''); /* ... all resets ... */
    }, 300)
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }
}, [isOpen])

// In the populate effect — cancel pending reset first:
useEffect(() => {
  if (isOpen && editTask) {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    setTitle(editTask.title)
    // ... rest of populate
  }
}, [isOpen, editTask])
```

### BUG 5 — MEDIUM: `encodeLabelInDescription` stores `[personal]` instead of null
**File:** `src/services/supabase.ts`
**Function:** `encodeLabelInDescription()`
**Problem:** When label = 'personal' and description is empty, the function returns `[personal]`
(non-null string). This means `addTask` stores `[personal]` in the `description` column
for every task that has no description, instead of `null`.
While functional, it means `stripLabelFromDescription` always has to handle this prefix,
and clean tasks appear to have a description.
**Fix:** If the label is the default `'personal'` and description is empty, return `''`
(which the caller coerces to `null`):
```typescript
export function encodeLabelInDescription(label: TaskLabel, desc: string): string {
  const stripped = desc.replace(/^\[[a-z]+\]\s*/, '').trim()
  if (!stripped && label === 'personal') return ''  // default label + no desc = null
  return stripped ? `[${label}] ${stripped}` : `[${label}]`
}
```

### BUG 6 — MEDIUM: `hasSpeechAPI` evaluated at module load time (iOS Safari)
**File:** `src/components/AssistantScreen.tsx`
**Problem:** `const hasSpeechAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition)`
is a module-level constant evaluated once when the JS bundle loads. On some iOS Safari
versions, the Speech API isn't registered on `window` until after a user gesture or
later in the page lifecycle. This causes the mic button to never appear even when supported.
**Fix:** Move the check inside the component using a `useState` + `useEffect`:
```typescript
const [hasSpeechAPI, setHasSpeechAPI] = useState(false)
useEffect(() => {
  setHasSpeechAPI(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
}, [])
```

### BUG 7 — LOW: Calendar DayPopup uses `key={t.id}` for recurring tasks
**File:** `src/components/CalendarScreen.tsx`
**Function:** `DayPopup` component, tasks.map
**Problem:** Same as BUG 3 — recurring task instances share the same `id`.
`key={t.id}` in the DayPopup task list could produce duplicate key warnings.
**Fix:** Use `key={`${t.id}-${dayKey(date)}`}` in the DayPopup tasks map.

### BUG 8 — LOW: `addTask` sort sentinel is fragile
**File:** `src/store/taskStore.ts`
**Function:** `addTask` — the sort after inserting a new task
**Problem:** `(a.task_time ?? '￿').localeCompare(b.task_time ?? '￿')` uses a high-Unicode
sentinel character `'￿'` to sort null times last. This works in most locales but is
brittle — locale-sensitive string comparison may not guarantee this character sorts last.
**Fix:** Use a simple ternary instead of localeCompare for the time sort:
```typescript
.sort((a, b) => {
  const dc = a.task_date.localeCompare(b.task_date)
  if (dc !== 0) return dc
  // null times sort after timed tasks
  if (!a.task_time && !b.task_time) return 0
  if (!a.task_time) return 1
  if (!b.task_time) return -1
  return a.task_time.localeCompare(b.task_time)
})
```

---

## Additional checks to perform

1. **Scan all `.tsx` files** for any remaining `key={t.id}` inside task list maps —
   replace with composite keys `${t.id}-${dateKey}` wherever recurring tasks could appear.

2. **Check `groupTasksByDay`** in `taskStore.ts`: the daily recurrence loop runs up to 366
   iterations but breaks when `dk > horizon`. Verify the horizon check works correctly
   for monthly recurrence (last day of month edge cases — e.g. Jan 31 + 1 month = Feb 28).

3. **Check `CalendarScreen.tsx` TimeGrid**: verify that `layoutDayTasks()` handles the case
   where `task_time_end` comes BEFORE `task_time` (user enters end time earlier than start).
   The overlap coloring would produce a negative duration span. Clamp end to at least
   `start + 15` minutes.

4. **Check `NotesScreen.tsx`**: the autosave debounce timer — verify the `useEffect` cleanup
   properly cancels the debounce timer on unmount to avoid the "state update on unmounted
   component" warning.

5. **Run `npx tsc --noEmit`** after all fixes and confirm zero errors.

---

## What NOT to change
- Do not change the Supabase schema or env vars
- Do not change the design tokens in `src/index.css`
- Do not add new dependencies
- Do not change the tab structure in `MobileApp.tsx`
- Notes screen remains local-only (no Supabase connection needed)

## After fixing
Run `npx tsc --noEmit` to confirm clean TypeScript.
List every file changed and every bug fixed with a 1-line summary.
