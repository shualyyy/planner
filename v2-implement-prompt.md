# Claude Code — Implement Dino Task v2 Design Handoff

## Project
React 18 + TypeScript + Vite PWA. iOS-first. Supabase + Zustand.
Repo: https://github.com/shualyyy/planner
`npx tsc --noEmit` must stay clean after all changes.

Read ALL files listed below before writing a single line:
- `src/index.css`
- `src/components/MobileApp.tsx`
- `src/components/TasksScreen.tsx`
- `src/components/AddTaskModal.tsx`
- `src/services/supabase.ts`
- `src/store/taskStore.ts`

---

## STEP 1 — Update design tokens in `src/index.css`

Replace the entire `:root` block (keep existing CSS below it intact).
Add new dark-first token set extracted from the design handoff:

```css
:root {
  --font-sans:  'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif: 'Fraunces', 'Inter', serif;

  /* ── Backgrounds ── */
  --bg:         #0A0A0F;
  --surface:    #111118;
  --surface2:   #16161E;
  --surface3:   #241F1C;
  --border:     rgba(255,255,255,0.07);
  --border-2:   rgba(255,255,255,0.10);
  --hairline:   rgba(255,255,255,0.06);

  /* ── Text ── */
  --text:       #F0ECE3;
  --text-2:     rgba(255,255,255,0.70);
  --text-muted: rgba(255,255,255,0.40);
  --text-faint: rgba(255,255,255,0.25);

  /* ── Accent ── */
  --accent:      #4A9EFF;
  --accent-soft: rgba(74,158,255,0.12);
  --accent-2:    rgba(74,158,255,0.30);
  --accent-ink:  #0A0A0F;
  --accent-glow: rgba(74,158,255,0.35);

  /* ── Brand (keep for logo/icon only) ── */
  --brand:      #D97757;
  --brand-deep: #B85A3D;

  /* ── Status ── */
  --success:      #3DD68C;
  --success-soft: rgba(61,214,140,0.12);
  --danger:       #FF5C5C;
  --danger-soft:  rgba(255,92,92,0.12);
  --danger-border:rgba(255,92,92,0.18);
  --danger-text:  #FF5C5C;
  --warning:      #E8A24A;
  --warning-soft: rgba(232,162,74,0.12);
  --info:         #4A9EFF;
  --info-hover:   #74B5FF;

  /* ── Project colors ── */
  --pc-blue:   #4A9EFF;
  --pc-purple: #A78BFA;
  --pc-amber:  #E8A24A;
  --pc-green:  #3DD68C;
  --pc-red:    #FF5C5C;
  --pc-teal:   #8ED4C8;
  --pc-pink:   #F5BDD0;
  --pc-brand:  #D97757;

  /* ── Label colors ── */
  --label-work:     #B8D4F2;
  --label-personal: #F5BDD0;
  --label-health:   #8ED4C8;
  --label-family:   #F5E28A;
  --label-travel:   #C8B4E8;
  --label-ink:      #1C1917;

  /* ── Radii ── */
  --r-chip:    999px;
  --r-card:    14px;
  --r-card-lg: 20px;
  --r-sheet:   28px;
  --r-input:   12px;

  /* ── Motion ── */
  --ease-ios:  cubic-bezier(0.32,0.72,0,1);
  --ease-snap: cubic-bezier(0.4,0,0.2,1);
  --t-fast:    0.15s;
  --t-base:    0.2s;
  --t-sheet:   0.32s;

  /* ── Shadows ── */
  --shadow:      rgba(0,0,0,0.30);
  --shadow-lg:   0 30px 80px rgba(0,0,0,0.5);
  --card-shadow: 0 0 0 1px var(--border);
  --sheet-shadow: 0 -8px 40px rgba(0,0,0,0.4);

  /* ── Tab bar ── */
  --tabbar-bg:     rgba(10,10,15,0.85);
  --tabbar-stroke: rgba(255,255,255,0.06);
  --tabbar-shadow: none;

  /* ── Misc ── */
  --panel:        var(--surface);
  --panel-2:      var(--surface2);
  --border-soft:  var(--border);
  --shadow-lg:    0 30px 80px rgba(0,0,0,0.5);
  --hover-overlay: rgba(255,255,255,0.04);
  --danger-text-2: #FF5C5C;
  --danger-soft-2: rgba(255,92,92,0.10);
  --success-soft: rgba(61,214,140,0.12);

  /* ── Calendar card ── */
  --cal-bg: #0A0A0F;
}
```

Also update body background:
```css
body { background: var(--bg); }
```

Update tab bar CSS to match handoff (flat bottom bar, not floating pill):
```css
.tabbar {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: 74px;
  background: rgba(10,10,15,0.85);
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 8px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: 400;
  transform: none;
  width: auto;
  border-radius: 0;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 0;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255,255,255,0.35);
  transition: color 0.15s;
}
.tab.on { color: #4A9EFF; }
.tab:active { transform: scale(0.88); }
.tab .tab-label {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
}
.tab-icon { transition: none; }
/* Remove old label animation — always visible */
.tab .tab-label { opacity: 1; transform: none; }
.tab.on .tab-icon { transform: none; }
```

Update FAB to be above new flat tab bar:
```css
.fab-v2 {
  position: fixed;
  bottom: calc(74px + env(safe-area-inset-bottom, 0px) + 16px);
  right: 22px;
  width: 52px; height: 52px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 8px 24px var(--accent-glow);
  z-index: 350;
  transition: transform 0.15s;
  border: none;
}
```

Update settings card for dark theme:
```css
.settings-card { background: var(--surface); border-radius: var(--r-card-lg); overflow: hidden; margin-bottom: 8px; box-shadow: var(--card-shadow); }
.settings-row { display: flex; align-items: center; gap: 14px; padding: 14px 18px; cursor: pointer; border: none; width: 100%; text-align: left; background: transparent; color: var(--text); }
.settings-row + .settings-row { border-top: 1px solid var(--hairline); }
.settings-section-label { font-size: 10.5px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.14em; padding: 16px 6px 8px; }
.set-icon { width: 32px; height: 32px; border-radius: 10px; background: var(--surface2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--text-2); }
```

---

## STEP 2 — Update `src/services/supabase.ts`

Add work-focused types after existing exports:

```typescript
export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'

export const TASK_STATUSES: Record<TaskStatus, { name: string; color: string; icon: string }> = {
  not_started: { name: 'To Do',       color: '#9BA8AB',  icon: '○' },
  in_progress:  { name: 'In Progress', color: '#4A9EFF',  icon: '◑' },
  blocked:      { name: 'Blocked',     color: '#FF5C5C',  icon: '⊘' },
  done:         { name: 'Done',        color: '#3DD68C',  icon: '●' },
}

export const TASK_PRIORITIES: Record<TaskPriority, { name: string; color: string }> = {
  high:   { name: 'High',   color: '#FF5C5C' },
  medium: { name: 'Medium', color: '#E8A24A' },
  low:    { name: 'Low',    color: 'rgba(255,255,255,0.3)' },
}

export interface Project {
  id: string
  name: string
  color: string
  description: string | null
  is_archived: boolean
  created_at: string
}

export interface Habit {
  id: string
  name: string
  icon: string
  color: string
  frequency: 'daily' | 'weekly'
  time_of_day: 'morning' | 'evening' | 'anytime'
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  completed_date: string  // 'yyyy-MM-dd'
  created_at: string
}
```

Add to existing `Task` interface:
```typescript
project_id?: string | null
status?: TaskStatus
priority?: TaskPriority
time_estimate?: number | null  // minutes
```

Output the following SQL block for the user to run in Supabase:
```sql
-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4A9EFF',
  description TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all" ON projects FOR ALL TO anon USING (true) WITH CHECK (true);

-- Tasks: add work fields
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS time_estimate INTEGER;

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'circle',
  color TEXT DEFAULT '#4A9EFF',
  frequency TEXT DEFAULT 'daily',
  time_of_day TEXT DEFAULT 'morning',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all" ON habits FOR ALL TO anon USING (true) WITH CHECK (true);

-- Habit logs
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, completed_date)
);
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all" ON habit_logs FOR ALL TO anon USING (true) WITH CHECK (true);
```

---

## STEP 3 — Update `src/store/taskStore.ts`

Add projects and habits to the store. Keep all existing task logic intact.

Add to `TaskStore` interface:
```typescript
projects: Project[]
fetchProjects: () => Promise<void>
addProject: (p: Omit<Project, 'id' | 'created_at'>) => Promise<Project>
deleteProject: (id: string) => Promise<void>

habits: Habit[]
habitLogs: HabitLog[]
fetchHabits: () => Promise<void>
addHabit: (h: Omit<Habit, 'id' | 'created_at'>) => Promise<void>
toggleHabitLog: (habitId: string, date: string) => Promise<void>
```

Implement using `supabase.from('projects')` and `supabase.from('habits')` / `supabase.from('habit_logs')`.

Add `projects: [], habits: [], habitLogs: []` to initial state.

In `fetchTasks` (or App.tsx mount), also call `fetchProjects()` and `fetchHabits()`.

---

## STEP 4 — Redesign `src/components/TasksScreen.tsx`

### New visual design (from handoff Screen 1):

**Header:**
```tsx
<div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, padding:'8px 22px 0' }}>
  <div>
    <div style={{ font:'600 11px Inter', letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:6 }}>Tasks</div>
    <div style={{ font:'300 32px/1 Fraunces', color:'#F0ECE3', letterSpacing:'-0.01em' }}>{dayName},<br/>{dayDate}</div>
  </div>
  <div style={{ width:40, height:40, borderRadius:'999px', background:'#16161E', border:'1px solid rgba(255,255,255,0.10)', display:'flex', alignItems:'center', justifyContent:'center', font:'600 13px Inter', color:'#C8C2B8' }}>АП</div>
</div>
```
Where `dayName` = format(today, 'EEEE') and `dayDate` = format(today, 'd MMMM').

**Habits strip (NEW):**
Below header, before task list:
```tsx
// "Привычки · X/Y →" link (right-aligned)
<div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10, padding:'0 22px' }}>
  <button onClick={() => setShowHabits(true)} style={{ font:'500 11px Inter', color:'#4A9EFF', display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer' }}>
    Привычки · {doneToday}/{total} <span style={{ fontSize:13 }}>→</span>
  </button>
</div>
// Horizontal scroll row of habit chips
<div style={{ display:'flex', gap:9, overflowX:'auto', marginBottom:26, padding:'0 22px 2px' }}>
  {habits.map(h => {
    const done = habitLogs.some(l => l.habit_id === h.id && l.completed_date === todayKey)
    return (
      <button key={h.id} onClick={() => toggleHabitLog(h.id, todayKey)}
        style={{ display:'flex', alignItems:'center', gap:8, height:36, padding:'0 13px', background:'#16161E', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, flexShrink:0, cursor:'pointer' }}>
        <span style={{ font:'500 12px Inter', color:'#F0ECE3' }}>{h.name}</span>
        {done
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#3DD68C"/><path d="M8 12.5l2.5 2.5L16 9" stroke="#0A0A0F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          : <span style={{ width:16, height:16, borderRadius:'999px', border:'1.5px solid rgba(255,255,255,0.25)' }} />
        }
      </button>
    )
  })}
</div>
```

**Task cards (from handoff):**
Each card: `background: #111118`, `border: '1px solid rgba(255,255,255,0.07)'`, `borderRadius: 14`, `padding: '14px 15px'`

Left: status circle:
- done: filled blue circle with checkmark
- in_progress: half-blue circle (border + gradient)
- blocked: empty circle red border
- not_started / default: empty circle `border: '2px solid rgba(255,255,255,0.25)'`

Right: priority ↑ icon (red) if high, project color dot (5px circle)

Tags row below title: time chip `{ background:'#16161E', borderRadius:6, padding:'3px 7px', font:'500 11px Inter', color:'rgba(255,255,255,0.35)' }` + project/label chip `{ background: projectColor+'1E', borderRadius:6, padding:'3px 7px', font:'500 11px Inter', color: projectColor }`

**Section headers:**
```tsx
<div style={{ font:'600 10px Inter', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:11 }}>Сегодня</div>
```
Tomorrow section: same but `color:'rgba(255,255,255,0.25)'` and tasks at `opacity:0.55`.

**History button** — keep existing "История" button, update styles to match dark theme.

---

## STEP 5 — Create `src/components/HabitsSheet.tsx`

Full bottom sheet (85vh) rendered via `createPortal(_, document.body)`.

**Structure (from handoff Screen 2):**

```tsx
// Overlay
<div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.55)' }}>
  // Sheet
  <div onClick={e => e.stopPropagation()} style={{ position:'absolute', left:0, right:0, bottom:0, height:'85%', background:'#111118', borderTopLeftRadius:28, borderTopRightRadius:28, borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column' }}>
```

**Header:**
- Drag handle (38px × 5px, borderRadius 999px, background rgba(255,255,255,0.18))
- "Привычки" in `font:'300 28px/1 Fraunces'`, color `#F0ECE3`
- "Июнь 2026" muted right + close × button (30px circle, background #16161E)

**Stats row (3 cards):**
Each card: `background:#16161E`, `border:'1px solid rgba(255,255,255,0.10)'`, `borderRadius:12`, `padding:'11px 12px'`
- 🔥 Серия: current streak days
- ✓ Месяц: done/total this month
- ⚡ Активных: habit count

**Habit list cards:**
Each: `background:#16161E`, `border:'1px solid rgba(255,255,255,0.08)'`, `borderRadius:16`, `padding:'14px 15px'`

Left icon square: `width:34`, `height:34`, `borderRadius:9`, `background: h.color+'26'` (color at 15% opacity)
Icon SVG stroked in `h.color`

Name: `font:'600 15px Inter'`, color `#F0ECE3`
Subtitle: `font:'400 11px Inter'`, color `rgba(255,255,255,0.4)` — "Ежедневно · Утро · серия X"

**7-day dot row (Mon–Sun current week):**
Each dot: `width:15`, `height:15`, `borderRadius:'999px'`
- Done: `background: h.color`
- Today (not yet done): `border: '1.5px solid h.color'`, `boxShadow: '0 0 0 3px '+h.color+'2E'`
- Miss: `background: rgba(255,92,92,0.18)` with 5px red dot inside
- Future: `border: '1.5px solid rgba(255,255,255,0.15)'`

Right: 28px checkbox circle. Done = filled `h.color` with checkmark. Not done = `border:'1.5px solid rgba(255,255,255,0.25)'`
Tapping toggles `toggleHabitLog(h.id, todayKey)`.

**Add habit button:**
`height:48`, `border:'1.5px dashed rgba(255,255,255,0.18)'`, `borderRadius:14`, centered "+ Добавить привычку"

Props:
```typescript
interface HabitsSheetProps {
  habits: Habit[]
  habitLogs: HabitLog[]
  onToggle: (habitId: string, date: string) => void
  onClose: () => void
}
```

---

## STEP 6 — Create `src/components/ProjectsScreen.tsx`

### Projects list view (handoff Screen 3):

**Header:**
```tsx
<div style={{ font:'300 34px/1 Fraunces', color:'#F0ECE3', letterSpacing:'-0.01em' }}>Работа</div>
<div style={{ font:'400 12px Inter', color:'rgba(255,255,255,0.4)', marginTop:7 }}>{projects.length} проектов · {totalTasks} задачи</div>
```
Filter pill right: `{ display:'flex', alignItems:'center', gap:7, height:32, padding:'0 12px', background:'#16161E', border:'1px solid rgba(255,255,255,0.10)', borderRadius:'999px' }` with funnel SVG + "Все"

**Project cards (from handoff):**
Each: `position:'relative'`, `height:88`, `background:'#111118'`, `border:'1px solid rgba(255,255,255,0.07)'`, `borderRadius:20`, `overflow:'hidden'`, flex row with `padding:'0 16px 0 19px'`, `gap:14`

Left accent bar: `position:'absolute'`, `left:0`, `top:14`, `bottom:14`, `width:3`, `borderRadius:'0 3px 3px 0'`, `background: p.color`

Center (flex:1): name `font:'600 15px Inter'` + category/count `font:'400 11px Inter' color:'rgba(255,255,255,0.4)'`

Progress: `width:80`, `height:3`, `borderRadius:'999px'`, `background:'rgba(255,255,255,0.10)'` with fill `background: p.color` at `width: pct+'%'`. Below: `font:'600 10px Inter' color:'rgba(255,255,255,0.55)'` showing "62%"

Status breakdown (3 rows of colored squares):
```tsx
<div style={{ display:'flex', flexDirection:'column', gap:4 }}>
  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
    <span style={{ width:7, height:7, borderRadius:2, background:'#4A9EFF' }}/>
    <span style={{ font:'500 10px Inter', color:'rgba(255,255,255,0.5)' }}>{inProgressCount}</span>
  </span>
  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
    <span style={{ width:7, height:7, borderRadius:2, background:'#FF5C5C' }}/>
    <span style={{ font:'500 10px Inter', color:'rgba(255,255,255,0.5)' }}>{blockedCount}</span>
  </span>
  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
    <span style={{ width:7, height:7, borderRadius:2, background:'#3DD68C' }}/>
    <span style={{ font:'500 10px Inter', color:'rgba(255,255,255,0.5)' }}>{doneCount}</span>
  </span>
</div>
```
Chevron "›" right `color:'rgba(255,255,255,0.25)'`.

Archived project: same card but `opacity:0.4`.

**Bottom CTA button:**
```tsx
<div style={{ padding:'14px 22px 26px', background:'linear-gradient(to top,#0A0A0F 70%,transparent)' }}>
  <button onClick={onAddProject} style={{ width:'100%', height:52, background:'#4A9EFF', borderRadius:14, border:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:8, color:'#fff', font:'600 14px Inter', boxShadow:'0 1px 0 rgba(255,255,255,0.15) inset', cursor:'pointer' }}>
    <span style={{ fontSize:18, lineHeight:1 }}>+</span> Новый проект
  </button>
</div>
```

Tapping a project → sets `selectedProject` state → shows `ProjectDetailView` inside the same screen (not a new tab).

---

## STEP 7 — Create `ProjectDetailView` inside ProjectsScreen

When a project is selected, render this in place of the list (slide animation: `transform: translateX(0)` in, `translateX(100%)` out via CSS transition).

**Header (from handoff Screen 4):**
- Back link: `← Работа` in `font:'500 13px Inter', color:'#4A9EFF'`
- Project name: `font:'300 30px/1 Fraunces', color:'#F0ECE3'` with 8px color dot before
- `···` menu button (30px circle)

**Stats row (4 metrics card):**
`background:'#111118'`, `border:'1px solid rgba(255,255,255,0.07)'`, `borderRadius:16`, flex row with `border-right: 1px solid rgba(255,255,255,0.07)` dividers.
Metrics: total tasks (white) | in progress (blue #4A9EFF) | blocked (red #FF5C5C) | % done (green #3DD68C)
Each: number `font:'600 18px Inter'`, label `font:'500 9px Inter' letterSpacing:'0.04em' textTransform:'uppercase' color:'rgba(255,255,255,0.4)'`

**Board / List toggle:**
"BOARD" label + 2-icon toggle (columns icon active=blue, list icon inactive).

**Kanban columns (horizontal scroll, from handoff Screen 4):**
`display:'flex'`, `gap:12`, `overflowX:'auto'`, `overflowY:'hidden'`

Each column: `width:210`, `flexShrink:0`

Column header: status icon circle (14px) + name (`font:'600 12px Inter'`) + count chip (`font:'600 10px Inter', background:'#16161E', borderRadius:'999px', padding:'2px 7px'`)

Status icons:
- To Do: empty circle `border:'2px solid rgba(255,255,255,0.3)'`
- In Progress: half-blue `border:'2px solid #4A9EFF', background:'linear-gradient(90deg,#4A9EFF 50%,transparent 50%)'`
- Blocked: circle with horizontal bar `border:'2px solid #FF5C5C'`
- Done: filled green circle with checkmark (SVG)

Task mini-card inside each column:
`background:'#111118'`, `border:'1px solid rgba(255,255,255,0.07)'` (Blocked column: `rgba(255,92,92,0.18)`), `borderRadius:14`, `padding:'12px 13px'`

Title row: 5px priority dot + title `font:'500 13px Inter'`
Bottom row: assignee avatar (20px circle, initials) + estimate chip `font:'500 10px Inter', background:'#16161E', borderRadius:6, padding:'3px 7px'`

Done column: tasks `opacity:0.6`, title strikethrough `rgba(255,255,255,0.2)`

**FAB in ProjectDetailView:** `+ Задача` centered pill button at bottom.

---

## STEP 8 — Redesign `src/components/AddTaskModal.tsx`

Replace the current multi-section pill form with the row-based design from handoff Screen 5.

The sheet keeps the same slide-up animation and overlay.

**Inside the sheet (after handle + header row):**

Title input (Fraunces, 24px, placeholder dimmed):
```tsx
<div style={{ padding:'18px 22px 6px' }}>
  <input type="text" ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
    placeholder="Название задачи..."
    style={{ font:'300 24px Fraunces', color: title ? '#F0ECE3' : 'rgba(240,236,227,0.35)', background:'transparent', border:'none', outline:'none', width:'100%' }} />
  <textarea value={description} onChange={e => setDescription(e.target.value)}
    placeholder="Описание (необязательно)" rows={1}
    style={{ font:'400 13px Inter', color:'rgba(255,255,255,0.3)', background:'transparent', border:'none', outline:'none', width:'100%', resize:'none', marginTop:9 }} />
</div>
```

**6 metadata rows** (each `height:48`, `borderBottom:'1px solid rgba(255,255,255,0.07)'`, flex between):

Row template:
```tsx
<div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:48, borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'0 22px' }}>
  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
    {/* icon SVG */}
    <span style={{ font:'500 14px Inter', color:'#F0ECE3' }}>{label}</span>
  </div>
  {/* right value */}
</div>
```

Row 1 — Project: folder SVG + "Проект" | pill with color dot + project name (or "Без проекта")
Row 2 — Status: status circle icon + "Статус" | pill showing current status
Row 3 — Priority: ↑ char + "Приоритет" | colored pill (↑ High in red, – Medium in amber, ↓ Low in muted)
Row 4 — Estimate: clock SVG + "Оценка" | 3 quick-pick pills (1ч, **2ч** active in blue, 4ч) + tap opens expanded picker
Row 5 — Date: calendar SVG + "Дата" | pill showing "Сегодня" / "Завтра" / date
Row 6 — Time: bell SVG + "Время" | pill showing time or "—" (no border-bottom on last row)

Tapping a row value opens an inline expandable section below the row (animated `maxHeight` transition).

**Save button:**
```tsx
<div style={{ padding:'18px 22px 30px' }}>
  <button onClick={handleSubmit} style={{ width:'100%', height:52, background:'#4A9EFF', borderRadius:12, border:'none', color:'#fff', font:'600 14px Inter', boxShadow:'0 1px 0 rgba(255,255,255,0.15) inset', cursor:'pointer' }}>
    {saving ? (isEditMode ? 'Сохранение…' : 'Добавление…') : (isEditMode ? 'Сохранить' : 'Добавить задачу')}
  </button>
</div>
```

Keep all existing `handleSubmit` / `addTask` / `updateTask` logic intact. Just update the UI layer.

---

## STEP 9 — Update `src/components/MobileApp.tsx`

### New tab structure (from handoff — 4 tabs, not 5):

```typescript
type Tab = 'calendar' | 'tasks' | 'projects' | 'settings'
```

```tsx
const TABS = [
  { id: 'calendar', Icon: CalendarTabIcon,  label: 'Calendar' },
  { id: 'tasks',    Icon: TasksTabIcon,      label: 'Tasks'    },
  { id: 'projects', Icon: ProjectsTabIcon,   label: 'Work'     },
  { id: 'settings', Icon: SettingsTabIcon,   label: 'You'      },
]
```

Add `ProjectsTabIcon` (briefcase SVG):
```tsx
const ProjectsTabIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
  </svg>
)
```

Remove Assistant tab (Notes tab already removed in a prior session — confirm current state first).

Tab active color: use `#4A9EFF` for active tab (not white). Inactive: `rgba(255,255,255,0.35)`.

Add `ProjectsScreen` panel. Pass habits/habitLogs/projects from store.

Add `HabitsSheet` as a portal, controlled by `showHabits` state passed from TasksScreen up to MobileApp, OR have TasksScreen manage it internally (preferred — keep it self-contained).

`showFab` condition: `(tab === 'calendar' || tab === 'tasks' || tab === 'projects') && !calPopupOpen`

Update screen padding — with flat tab bar, screens need `paddingBottom: calc(74px + env(safe-area-inset-bottom, 0px) + 8px)`.

---

## STEP 10 — Verification

```bash
cd /Users/shualy/Desktop/Planer && npx tsc --noEmit 2>&1
```

Must pass clean. Fix any TypeScript errors before finishing.

Final output:
```
✅ TypeScript: CLEAN

## SQL to run in Supabase
[paste full SQL block]

## Files created
- src/components/HabitsSheet.tsx
- src/components/ProjectsScreen.tsx

## Files modified
- src/index.css
- src/services/supabase.ts
- src/store/taskStore.ts
- src/components/TasksScreen.tsx
- src/components/AddTaskModal.tsx
- src/components/MobileApp.tsx
```

---

## STOP CONDITIONS
- STOP if a new npm dependency is required
- STOP if TypeScript errors persist after 2 fix attempts
- STOP if Supabase schema changes beyond the SQL block above are needed

## FORBIDDEN
- Do NOT change CalendarScreen.tsx logic
- Do NOT change AssistantScreen.tsx
- Do NOT add a router library
- Do NOT modify vite.config.ts or index.html
- Do NOT rename existing Zustand store methods
- Do NOT break existing recurring tasks or groupTasksByDay logic
