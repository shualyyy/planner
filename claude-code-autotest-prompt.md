# Claude Code — Autonomous QA: Find & Fix All Bugs

## Starting state
React 18 + TypeScript + Vite PWA in `/Users/shualy/Desktop/Planer`.
Supabase backend. Zustand state. iOS-first mobile planner app called "Dino Task".
`npx tsc --noEmit` currently passes clean. No test suite exists.

## Target state
Every bug listed below is fixed. TypeScript still passes clean.
All changes are minimal — no refactoring, no new features, no new files.

---

## PHASE 1 — Static analysis (run first, before touching any files)

Execute these commands in the project root. Read every output carefully.

```bash
cd /Users/shualy/Desktop/Planer
npx tsc --noEmit 2>&1
```

```bash
npx eslint src --ext .ts,.tsx --max-warnings 0 2>&1
```

If ESLint is not configured, skip it and note the absence.

Then read ALL of these files completely before making any edits:
- `src/store/taskStore.ts`
- `src/services/supabase.ts`
- `src/components/AddTaskModal.tsx`
- `src/components/TasksScreen.tsx`
- `src/components/CalendarScreen.tsx`
- `src/components/AssistantScreen.tsx`
- `src/components/MobileApp.tsx`
- `src/index.css`

After reading, output: ✅ PHASE 1 complete — [list any TSC or ESLint issues found]

---

## PHASE 2 — Logic analysis (find bugs by reading, no edits yet)

Investigate each of the following areas and confirm whether the bug exists.
For each: output CONFIRMED or NOT FOUND with 1-line explanation.

**Check A — AddTaskModal `is_done` in edit mode**
File: `src/components/AddTaskModal.tsx`, function `handleSubmit()`
Question: Does the payload object contain `is_done: false` hardcoded for BOTH add and edit modes?
If yes → CONFIRMED. Editing a completed task silently un-completes it in Supabase.

**Check B — React key collision on recurring tasks (TasksScreen)**
File: `src/components/TasksScreen.tsx`
Question: Does `renderDayGroup()` use `key={t.id}` on task rows without a date component?
Does `HistorySheet` also use `key={t.id}` on task rows?
Since `groupTasksByDay()` generates recurring instances that share the same `id` across dates,
check whether React could see duplicate keys within a single day group.

**Check C — React key collision on recurring tasks (CalendarScreen DayPopup)**
File: `src/components/CalendarScreen.tsx`, inside `DayPopup` component
Question: Does the tasks.map use `key={t.id}` without a date suffix?

**Check D — Pinned tasks `daysLeft` timezone bug**
File: `src/components/TasksScreen.tsx`, inside `pinnedTasks` useMemo
Question: Does the code call `new Date(t.pin_end)` WITHOUT appending `T12:00:00`?
`new Date('2024-01-15')` parses as UTC midnight. On UTC+3 (Moscow), this is correct.
But on UTC-5 it becomes the previous day, causing daysLeft to be off by 1.
The safe fix is always `new Date(t.pin_end + 'T12:00:00')`.

**Check E — Race condition: reset timer vs populate in AddTaskModal**
File: `src/components/AddTaskModal.tsx`
Question: Is there a `useEffect` that resets form fields after a 300ms delay when `isOpen` becomes false?
Is there a SEPARATE `useEffect` that populates fields immediately when `isOpen` becomes true + `editTask` is set?
If both exist with no shared cancellation mechanism, closing and reopening within 300ms will wipe the edit fields.

**Check F — `hasSpeechAPI` evaluated at module load time**
File: `src/components/AssistantScreen.tsx`
Question: Is `const hasSpeechAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition)`
a module-level constant (outside any function or hook)?
On some iOS Safari versions, the Speech API registers on `window` after the first user interaction,
so evaluating at import time always returns false even when the API is available.

**Check G — `addTask` sort uses fragile Unicode sentinel**
File: `src/store/taskStore.ts`, inside `addTask`
Question: Does the sort after insertion use a Unicode sentinel character (like `'￿'` or `'￿'`)
as a placeholder for null `task_time` values? This is locale-sensitive and fragile.

**Check H — `encodeLabelInDescription` stores label prefix when description is empty**
File: `src/services/supabase.ts`, function `encodeLabelInDescription()`
Question: When label is `'personal'` and desc is empty, does the function return `'[personal]'`
instead of an empty string? This means addTask stores `[personal]` in Supabase instead of null.

**Check I — TimeGrid negative duration for tasks where end < start**
File: `src/components/CalendarScreen.tsx`, function `layoutDayTasks()`
Question: Is there a clamp ensuring that `end >= start + 15` minutes?
If a user enters an end time before the start time, the block renders with negative height.

After all checks: output ✅ PHASE 2 complete — CONFIRMED: [list], NOT FOUND: [list]

---

## PHASE 3 — Fix all CONFIRMED bugs (edit files)

Fix ONLY the bugs confirmed in Phase 2. Do NOT fix anything that was NOT FOUND.
After each fix: output ✅ Fixed [Check X] in [filename]:[line range]

### Fix A — `is_done` in edit mode
In `handleSubmit()`, change:
```typescript
is_done: false as const,
```
to:
```typescript
is_done: isEditMode ? (editTask?.is_done ?? false) : false,
```

### Fix B — TasksScreen React keys
In `renderDayGroup()`, change `key={t.id}` on the task row wrapper div to:
`key={`${t.id}-${dk}`}`
In `HistorySheet`, change `key={t.id}` on the task row wrapper div to:
`key={`${t.id}-${dk}`}`

### Fix C — CalendarScreen DayPopup React keys
In the DayPopup tasks.map, find the element with `key={t.id}` and change to:
`key={`${t.id}-${dayKey(date)}`}`

### Fix D — Pinned tasks timezone
In the `pinnedTasks` useMemo, change:
```typescript
new Date(t.pin_end)
```
to:
```typescript
new Date(t.pin_end + 'T12:00:00')
```

### Fix E — Race condition in AddTaskModal
Add a `useRef<ReturnType<typeof setTimeout> | null>` called `resetTimerRef` near the other refs.
In the reset `useEffect` (the one that fires when `isOpen` is false), wrap the setTimeout in the ref
and add a cleanup that clears it:
```typescript
useEffect(() => {
  if (!isOpen) {
    resetTimerRef.current = setTimeout(() => {
      setTitle(''); setTime(''); setTimeEnd(''); setIsAllDay(false)
      setLabel('personal'); setRecurrence(null); setIsPinned(false)
      setPinDuration('week'); setDescription(''); setSaving(false); setError('')
      setVisible(false)
    }, 300)
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }
}, [isOpen])
```
In the populate `useEffect` (the one that fires when `isOpen && editTask`), add at the top:
```typescript
if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
```

### Fix F — `hasSpeechAPI` module-level evaluation
Move `hasSpeechAPI` from module scope into the component as a `useState` + `useEffect`:
```typescript
const [hasSpeechAPI, setHasSpeechAPI] = useState(false)
useEffect(() => {
  setHasSpeechAPI(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
}, [])
```
Remove the module-level `const hasSpeechAPI` line.

### Fix G — Sort sentinel in addTask
Replace the fragile sentinel sort with explicit null-last logic:
```typescript
.sort((a, b) => {
  const dc = a.task_date.localeCompare(b.task_date)
  if (dc !== 0) return dc
  if (!a.task_time && !b.task_time) return 0
  if (!a.task_time) return 1
  if (!b.task_time) return -1
  return a.task_time.localeCompare(b.task_time)
})
```

### Fix H — encodeLabelInDescription default label
In `encodeLabelInDescription()`, add an early return for the default case:
```typescript
export function encodeLabelInDescription(label: TaskLabel, desc: string): string {
  const stripped = desc.replace(/^\[[a-z]+\]\s*/, '').trim()
  if (!stripped && label === 'personal') return ''
  return stripped ? `[${label}] ${stripped}` : `[${label}]`
}
```

### Fix I — TimeGrid negative duration clamp
In `layoutDayTasks()`, when computing `end`, clamp it:
```typescript
end: Math.max(
  t.task_time_end ? toMins(t.task_time_end) : toMins(t.task_time!) + 60,
  toMins(t.task_time!) + 15
),
```

---

## PHASE 4 — Verification

Run TypeScript check. It MUST pass with zero errors:
```bash
cd /Users/shualy/Desktop/Planer && npx tsc --noEmit 2>&1
```

If it fails, fix the TypeScript errors introduced by your edits before proceeding.

Output final report:
```
✅ PHASE 4 — TypeScript: CLEAN

## Summary of fixes applied
- [Check X] [filename] — [1-line description of what was fixed]
- ...

## Bugs confirmed but intentionally not fixed (if any)
- ...

## Checks that were NOT FOUND (no action taken)
- ...
```

---

## STOP CONDITIONS — do not proceed past these without asking

- STOP if any fix would require adding a new import that doesn't already exist
- STOP if any fix would change the Supabase table schema
- STOP if TypeScript after Phase 4 has new errors you cannot resolve in 1 edit
- STOP if you find a bug not listed in this prompt that requires significant refactoring

## FORBIDDEN
- Do NOT add new files
- Do NOT add new npm dependencies
- Do NOT change `src/index.css` design tokens
- Do NOT change the component prop interfaces
- Do NOT refactor or rename anything beyond what is listed above
- Do NOT touch `vite.config.ts`, `index.html`, or any config files
