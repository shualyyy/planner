# Planer UI — Full Redesign Migration

## Goal
Migrate the Planer PWA from a 3-tab dark-only UI to the approved 5-tab light/dark design (v8).
Keep all Supabase backend logic intact (supabase.ts, aiService.ts, Edge Function, taskStore CRUD).
Only update the UI layer.

---

## Current structure
```
src/
  App.tsx
  index.css
  components/
    MobileApp.tsx        ← 3 tabs: calendar, today, chat
    Calendar.tsx         ← week+day time grid
    TodayTasks.tsx       ← today's task list
    ChatPanel.tsx        ← AI chat
    AddTaskModal.tsx     ← add/edit task modal (KEEP AS-IS)
    LoginPage.tsx        ← (KEEP AS-IS)
    SettingsModal.tsx    ← modal with sign-out
    icons.tsx
  services/
    supabase.ts          ← Task interface, supabase client (KEEP AS-IS)
    aiService.ts         ← sendMessage(), ParsedTask (KEEP AS-IS)
  store/
    taskStore.ts         ← Zustand store with Supabase CRUD (KEEP AS-IS, extend only)
  hooks/
    useIsMobile.ts       ← (KEEP AS-IS)
```

---

## Task data model (Supabase, unchanged)
```ts
interface Task {
  id: string
  title: string
  task_date: string        // 'yyyy-MM-dd' ISO format
  task_time: string | null // 'HH:MM' 24h or null
  task_time_end: string | null
  is_all_day: boolean
  description: string | null
  created_at: string
}
```

The taskStore exposes:
- `tasks: Task[]` — all tasks from Supabase, sorted by task_date
- `donIds: Set<string>` — local-only done state (toggled with `toggleDone(id)`)
- `addTask`, `updateTask`, `deleteTask`, `toggleDone`, `fetchTasks`

---

## Changes to make

### 1. Extend taskStore.ts — add theme state
Add to the store:
```ts
theme: 'light' | 'dark'
setTheme: (t: 'light' | 'dark') => void
```
Initialize `theme: 'light'`. Apply theme to `document.documentElement.setAttribute('data-theme', theme)` inside setTheme and on store init via a `useEffect` in App.tsx.

Also add a computed helper (not in store, just a util function exported from taskStore.ts):
```ts
// Groups Task[] into Record<'yyyy-MM-dd', (Task & { done: boolean })[]>
export function groupTasksByDay(
  tasks: Task[],
  donIds: Set<string>
): Record<string, (Task & { done: boolean })[]> {
  return tasks.reduce((acc, t) => {
    if (!acc[t.task_date]) acc[t.task_date] = []
    acc[t.task_date].push({ ...t, done: donIds.has(t.id) })
    return acc
  }, {} as Record<string, (Task & { done: boolean })[]>)
}
```

---

### 2. Rewrite index.css completely

Define TWO theme layers via `[data-theme="light"]` and `[data-theme="dark"]` on `:root` / `html`:

```css
/* ── Light theme (default) ── */
[data-theme="light"], :root {
  --bg:           #F7F4F1;
  --surface:      #FFFFFF;
  --surface2:     #F0ECE8;
  --border:       #E4DED9;
  --text:         #1C1917;
  --text-2:       #6B6360;
  --text-muted:   #A89E9A;
  --accent:       #E8845A;
  --accent-soft:  #F5E6DF;
  --danger:       #E05C5C;
  --shadow:       rgba(0,0,0,0.08);
}

/* ── Dark theme ── */
[data-theme="dark"] {
  --bg:           #0E0C0B;
  --surface:      #1B1714;
  --surface2:     #241F1C;
  --border:       #2E2824;
  --text:         #F2EBE6;
  --text-2:       #A89E9A;
  --text-muted:   #6B6360;
  --accent:       #E8845A;
  --accent-soft:  rgba(232,132,90,0.15);
  --danger:       #E05C5C;
  --shadow:       rgba(0,0,0,0.30);
}
```

Then add all component styles (see details in sections below). Use `var(--*)` everywhere — no hardcoded colors.

Pastel event colors (same in both themes):
```css
:root {
  --ev-0: #B8D4F2;
  --ev-1: #F5BDD0;
  --ev-2: #F5E28A;
  --ev-3: #8ED4C8;
  --ev-4: #C8B4E8;
  --ev-5: #A8D8B0;
}
```

---

### 3. Rewrite MobileApp.tsx — 5-tab layout

New tab IDs: `'calendar' | 'tasks' | 'assistant' | 'wins' | 'settings'`

Layout:
```
┌─────────────────────┐
│  screen content     │  flex: 1, overflow: hidden
│                     │
│                     │
│  ┌───────────────┐  │
│  │ floating pill │  │  position: fixed, bottom: safe-area + 12px, centered
│  └───────────────┘  │
└─────────────────────┘
```

Floating pill tab bar CSS:
```css
.tabbar {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--surface);
  border-radius: 999px;
  padding: 8px 12px;
  box-shadow: 0 4px 24px var(--shadow), 0 0 0 1px var(--border);
  z-index: 100;
}
.tab {
  width: 44px; height: 44px;
  border-radius: 50%;
  border: none;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  position: relative;
}
.tab-glow {
  position: absolute;
  bottom: 4px; left: 50%; transform: translateX(-50%);
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--accent);
}
```

All 5 screens mounted simultaneously, only the active one is `display: block` (others `display: none`). This keeps state alive when switching tabs.

MobileApp needs to import and use: `useTaskStore`, `groupTasksByDay`, `AddTaskModal`.
It manages: `tab` state, `modalOpen` state, `modalDate` (Date | null), `modalTime` (string).

Pass to screens:
- CalendarScreen: `tasks={grouped}` `onAdd={(date, time) => { setModalDate(date); setModalTime(time||''); setModalOpen(true) }}` `onToggle={(dateKey, taskId) => store.toggleDone(taskId)}`
- TasksScreen: same `tasks`, `onToggle`, `onDelete={(_, id) => store.deleteTask(id)}`, `onAdd={() => setModalOpen(true)}`
- AssistantScreen: no props (uses store internally)
- WinsScreen: no props
- SettingsScreen: no props (uses store internally for theme)

Remove the old gear button and SettingsModal.

---

### 4. New component: CalendarScreen.tsx

Replace Calendar.tsx with a new CalendarScreen.tsx implementing 30d / 3d / 1d views.

```ts
interface CalendarScreenProps {
  tasks: Record<string, (Task & { done: boolean })[]>
  onAdd: (date: Date, time?: string) => void
  onToggle: (dateKey: string, taskId: string) => void
}
```

Key implementation details:

**dayKey helper** (use ISO format to match Supabase):
```ts
const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
```

**Calendar30**: 6×7 grid. Show month name in topbar. Single-letter weekday headers (M T W T F S S). Each cell: date number + up to 2 colored task chips (colored by `id` mod 6 using CSS vars `--ev-0` ... `--ev-5`). Today cell highlighted with accent. Tap → DayPopup.

**Calendar3**: 3-column time grid. Columns: anchor-1, anchor, anchor+1. Time labels on the left (06:00–23:00, hide 00:00). Each column 64px/hour. Event blocks: `top = h*64 + (m/60)*64`, height = 56px, colored by id mod 6. Red "now" line only in today's column. Day headers above each column: short weekday + date number, today highlighted. Scrolls to current hour on mount. Tapping empty cell calls `onAdd(day, 'HH:00')`.

**Calendar1**: Single-day time grid. Same layout as one column of Calendar3. Scrolls to current hour. Red now line if today. Tap cell → `onAdd(date, 'HH:00')`.

**DayPopup**: Slide-up modal (backdrop covers screen, card slides from bottom). Shows: date title, task list with circular checkboxes, time chips, "+ Add task" button. Tapping backdrop closes. Task row tap → `onToggle`. Checkbox: `border-radius: 50%`, 18×18px, border `1.5px solid var(--border)`, checked fills with `var(--accent)`.

**Topbar**: Month name for 30d (no avatar button). Left/right chevrons + date range label for 3d/1d. Segment pills (30d · 3d · 1d) always visible on the right. No slide animation on anchor change — use `key` only on cal-body contents, not topbar.

**Segment pills style**:
```css
.seg { background: var(--surface2); border-radius: 999px; padding: 3px; display: flex; gap: 2px; }
.seg-pill { border: none; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 500; cursor: pointer; background: transparent; color: var(--text-muted); transition: all 0.15s; }
.seg-pill.on { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px var(--shadow); }
```

---

### 5. New component: TasksScreen.tsx

Replace TodayTasks.tsx with TasksScreen.tsx.

```ts
interface TasksScreenProps {
  tasks: Record<string, (Task & { done: boolean })[]>
  onToggle: (dateKey: string, taskId: string) => void
  onDelete: (dateKey: string, taskId: string) => void
  onAdd: () => void
}
```

Groups tasks by day, sorted ascending. Each group: date header (e.g. "Monday, May 16") + task rows.

TaskRow: swipe-left gesture (onTouchStart / onTouchEnd, deltaX < -50 reveals actions). Actions: edit button (opens AddTaskModal pre-filled — pass task id back up) + red delete button. Long-press (onContextMenu) also toggles swipe state. Circular checkbox on left. Task title. Time chip on right if has time. Done state: line-through + muted color.

FAB: position fixed, bottom: calc(env(safe-area-inset-bottom,0px) + 80px), right: 20px. Size 52px, border-radius 50%, background var(--accent), shadow.

Empty state: centered illustration + "No tasks yet" + primary button.

---

### 6. New component: AssistantScreen.tsx

Replace ChatPanel.tsx with AssistantScreen.tsx.

Keep ALL the existing logic from ChatPanel.tsx:
- `sendMessage()` from aiService.ts
- `addTask()` from useTaskStore
- Speech recognition (SpeechRecognition API)
- Message history state
- Loading dots animation

Update the visual style to match the new design:
- Background: `var(--bg)`
- Message bubbles: user → `var(--accent)` bg, white text. Assistant → `var(--surface)` bg, `var(--text)`.
- AI avatar: 24×24 rounded square, `var(--surface2)` bg, sparkle icon `var(--accent)`.
- Suggestion chips: `var(--surface)` bg, `var(--border)` border, `var(--text-2)` color, border-radius 999px.
- Input area: `var(--surface)` bg, `var(--border)` border, border-radius 16px.
- Topbar: "AI Assistant" label + green pulse dot.

SUGGESTION chips (hardcode in Russian, same as before):
```ts
const SUGGESTIONS = ['Встреча завтра в 10:00', 'Позвонить маме в пятницу', 'Тренировка сегодня в 19:00']
```

---

### 7. New component: WinsScreen.tsx

Simple placeholder screen:
```tsx
export default function WinsScreen() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  height:'100%', gap:12, padding:32, textAlign:'center', background:'var(--bg)' }}>
      <div style={{ fontSize:48 }}>🏆</div>
      <div style={{ fontSize:18, fontWeight:600, color:'var(--text)' }}>Big update coming</div>
      <div style={{ fontSize:14, color:'var(--text-muted)', lineHeight:1.5 }}>
        We're building something special.<br/>Stay tuned.
      </div>
    </div>
  )
}
```

---

### 8. New component: SettingsScreen.tsx

Replace SettingsModal.tsx with a full-screen SettingsScreen.tsx.

Uses `useTaskStore` to get `theme` and `setTheme`. Uses `supabase.auth.signOut()` for sign-out.

Sections:
1. **Account** — show user email (from `supabase.auth.getUser()`), plan "Free", sign-out button (danger style)
2. **Appearance** — Theme toggle: Light / Dark segment control (same pattern as seg pills but with sun/moon icons)
3. **Notifications** — "Reminders" row with "Soon" badge + disabled toggle
4. Version footer: "Planer v0.1.0"

```css
.settings-card {
  background: var(--surface);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 8px;
}
.settings-row {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; cursor: pointer;
}
.settings-divider { height: 1px; background: var(--border); margin: 0 16px; }
.settings-section-label {
  font-size: 12px; font-weight: 500; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.06em;
  padding: 16px 4px 6px;
}
```

---

### 9. Update icons.tsx

Keep all existing icons. Add these new ones for the tab bar:

```tsx
export const CalendarTabIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="3"/>
    <path d="M3 10h18M8 3v4M16 3v4"/>
  </svg>
)
export const TasksTabIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l2 2 4-4M9 13l2 2 4-4M5 6h.01M5 13h.01M5 20h14"/>
  </svg>
)
export const AssistantTabIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16a2 2 0 012 2v9a2 2 0 01-2 2h-8l-5 4v-4H4a2 2 0 01-2-2V7a2 2 0 012-2z"/>
  </svg>
)
export const WinsTabIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8M12 17v4M17 3H7l2 7H9a4 4 0 004 4 4 4 0 004-4h-2l2-7z"/>
  </svg>
)
export const SettingsTabIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)
export const SparkleIcon = ({ color }: { color: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
    <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9z" opacity="0.6"/>
  </svg>
)
```

---

### 10. Keep unchanged
- `src/services/supabase.ts`
- `src/services/aiService.ts`
- `src/components/AddTaskModal.tsx`
- `src/components/LoginPage.tsx`
- `src/hooks/useIsMobile.ts`
- `supabase/functions/chat/index.ts`
- All env files, vite config, package.json

---

## Implementation order
1. `index.css` — new CSS variables + all component styles
2. `taskStore.ts` — add theme state + export `groupTasksByDay`
3. `icons.tsx` — add new tab icons
4. `CalendarScreen.tsx` — new file (replaces Calendar.tsx)
5. `TasksScreen.tsx` — new file (replaces TodayTasks.tsx)
6. `AssistantScreen.tsx` — new file (replaces ChatPanel.tsx)
7. `WinsScreen.tsx` — new file
8. `SettingsScreen.tsx` — new file (replaces SettingsModal.tsx)
9. `MobileApp.tsx` — rewrite with 5-tab floating pill layout
10. `App.tsx` — add `useEffect` to sync theme to `data-theme` attribute on `document.documentElement`

After implementing, run `npm run build` to verify no TypeScript errors.

---

## Design constraints
- All colors via CSS variables — no hardcoded hex in components
- `border-radius`: event blocks 10px, popup card 20px, task rows 10px, settings cards 14px, FAB 50%
- `font-weight`: 400 base, 500 emphasis, 600 titles — no 700 except screen titles
- Transitions: `all 0.15s ease` for interactive elements
- Touch targets: minimum 44×44px
- `WebkitTapHighlightColor: transparent` on all buttons
- The floating tab bar bottom offset: `calc(env(safe-area-inset-bottom, 0px) + 12px)` — screens need `padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 80px)` so content doesn't hide behind tab bar
