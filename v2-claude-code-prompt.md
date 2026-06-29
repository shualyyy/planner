# Claude Code — Dino Task v2: Work-Focused Features

## Context
React 18 + TypeScript + Vite PWA. Supabase backend. Zustand store. iOS-first mobile app.
Repo: https://github.com/shualyyy/planner
`npx tsc --noEmit` must remain clean after all changes.

## Goal
Add work-focused features to Dino Task v1: Projects, Task Statuses, Priority Levels, and Search.
These are additive changes — do NOT break any existing functionality.

---

## STEP 1 — Supabase schema (SQL to run manually — output it, don't run it)

Output the following SQL for the user to run in Supabase SQL editor:

```sql
-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4A9EFF',
  description TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add work fields to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'blocked', 'done')),
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS time_estimate INTEGER; -- minutes

-- RLS for projects (match existing tasks policies)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all" ON projects FOR ALL TO anon USING (true) WITH CHECK (true);
```

Then output: ✅ STEP 1 — SQL ready. User must run this in Supabase before continuing.

---

## STEP 2 — Update TypeScript types

**File: `src/services/supabase.ts`**

Add to the existing `Task` interface:
```typescript
project_id?: string | null
status?: 'not_started' | 'in_progress' | 'blocked' | 'done'
priority?: 'high' | 'medium' | 'low'
time_estimate?: number | null  // minutes
```

Add new types and constants below the existing exports:
```typescript
export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'

export const TASK_STATUSES: Record<TaskStatus, { name: string; color: string; icon: string }> = {
  not_started: { name: 'To Do',      color: '#9BA8AB', icon: '○' },
  in_progress:  { name: 'In Progress',color: '#4A9EFF', icon: '◑' },
  blocked:      { name: 'Blocked',   color: '#D94F4F', icon: '⊘' },
  done:         { name: 'Done',      color: '#3CC68A', icon: '●' },
}

export const TASK_PRIORITIES: Record<TaskPriority, { name: string; color: string }> = {
  high:   { name: 'High',   color: '#D94F4F' },
  medium: { name: 'Medium', color: '#C8A84B' },
  low:    { name: 'Low',    color: '#9BA8AB' },
}

export interface Project {
  id: string
  name: string
  color: string
  description: string | null
  is_archived: boolean
  created_at: string
}
```

---

## STEP 3 — Update Zustand store

**File: `src/store/taskStore.ts`**

Add a `projects` slice to the existing store. Keep all existing task logic intact.

Add to the `TaskStore` interface:
```typescript
projects: Project[]
fetchProjects: () => Promise<void>
addProject: (p: Omit<Project, 'id' | 'created_at'>) => Promise<void>
updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>) => Promise<void>
deleteProject: (id: string) => Promise<void>
```

Implement each using `supabase.from('projects')`, following the same pattern as existing task methods.

Update `fetchTasks` — it already fetches all tasks. No change needed there.

Update `addTask` to accept the new fields in its `Omit<Task, ...>` type — they're optional so no other change needed.

Update `updateTask` similarly — partial updates already work.

Add to initial store state: `projects: []`

Call `fetchProjects()` alongside `fetchTasks()` in `App.tsx` or wherever `fetchTasks` is called on mount.

---

## STEP 4 — Create ProjectsScreen

**New file: `src/components/ProjectsScreen.tsx`**

This replaces the current Tasks tab OR becomes its own tab. Use the Tasks tab slot — rename it from "Tasks" to "Projects" in `MobileApp.tsx`.

The ProjectsScreen has two sub-views toggled by a pill segmented control at the top:
- **Projects** view (default)
- **All tasks** view (shows every task regardless of project, same as current TasksScreen)

### Projects view:
Hero: "Проекты" title in Fraunces serif. Button to create a new project (top right, calls `handleAddProject`).

Project card (for each project):
- Colored left border (project.color)
- Project name (15px bold)
- Task count: "X задач · Y в работе" (12px muted)
- Progress bar: % of done tasks out of total
- Tap → opens ProjectDetailView (inline, not a new screen — animate slide in from right using CSS transition, back button top left)

Empty state: "Нет проектов. Создай первый." with a large + button.

### ProjectDetailView (shown when a project is tapped):
Header: back arrow + project name + color dot + "Edit" button
Body: list of tasks belonging to this project, grouped by status (To Do / In Progress / Blocked / Done sections)
Each task row: same swipeable TaskRow as in TasksScreen but with status pill and priority dot
FAB at bottom: "+ Задача" → opens AddTaskModal with project pre-selected

### All tasks view:
Identical to current TasksScreen content (today + future, pinned goals, history button). Copy the render logic from TasksScreen.tsx. Do not import TasksScreen — duplicate the relevant JSX to keep this file self-contained.

---

## STEP 5 — Create AddProjectModal

**New file: `src/components/AddProjectModal.tsx`**

Bottom sheet modal (same pattern as AddTaskModal):
- Project name input (Fraunces serif, large, placeholder "Название проекта")
- Color picker: 8 color swatches as tappable circles
  - `#4A9EFF` (blue), `#3CC68A` (green), `#D94F4F` (red), `#C8A84B` (amber),
    `#9B7ACC` (purple), `#D97757` (brand), `#8ED4C8` (teal), `#F5BDD0` (pink)
- Description textarea (optional, 2 rows, placeholder "Описание (необязательно)")
- Save button: "Создать проект" / "Сохранить"
- Props: `isOpen`, `onClose`, `editProject?: Project`

---

## STEP 6 — Update AddTaskModal

**File: `src/components/AddTaskModal.tsx`**

Add three new sections to the form, placed between the Label section and the Repeat section:

### Project picker
```
Label: PROJECT
Row of project pills (same pill style as label pills):
- "Без проекта" pill (active when project_id is null)
- One pill per project from store: colored dot + project.name
```
Use `useTaskStore()` to get `projects`.

### Status picker
```
Label: STATUS
4 pills: To Do | In Progress | Blocked | Done
Each pill shows the status icon + name
Active pill uses status.color as background
Default: 'not_started'
```

### Priority picker
```
Label: PRIORITY
3 pills: High | Medium | Low
Active pill shows priority color
Default: 'medium'
```

### Time estimate (compact, optional)
```
Label: ESTIMATE
Row of quick-pick pills: 15m | 30m | 1h | 2h | 4h | 8h
Tapping a pill sets time_estimate (in minutes: 15, 30, 60, 120, 240, 480)
Active pill highlighted
```

Update the `payload` object in `handleSubmit` to include:
```typescript
project_id: selectedProjectId ?? null,
status: status,
priority: priority,
time_estimate: timeEstimate ?? null,
```

Update edit-mode populate `useEffect` to also set `status`, `priority`, `project_id`, `time_estimate` from `editTask`.

---

## STEP 7 — Update TaskRow to show status + priority

**File: `src/components/TasksScreen.tsx`** and wherever TaskRow is used

In the task row body (below the title line), add inline to the existing label row:
```tsx
// After the label dot + label name:
{task.priority && task.priority !== 'medium' && (
  <span style={{
    fontSize: '10px', fontWeight: 600, padding: '1px 6px',
    borderRadius: '999px',
    background: TASK_PRIORITIES[task.priority].color + '22',
    color: TASK_PRIORITIES[task.priority].color,
  }}>
    {task.priority === 'high' ? '↑ High' : '↓ Low'}
  </span>
)}
{task.status && task.status !== 'not_started' && task.status !== 'done' && (
  <span style={{
    fontSize: '10px', fontWeight: 500,
    color: TASK_STATUSES[task.status].color,
  }}>
    {TASK_STATUSES[task.status].icon} {TASK_STATUSES[task.status].name}
  </span>
)}
```

Import `TASK_STATUSES` and `TASK_PRIORITIES` from `../services/supabase`.

---

## STEP 8 — Add Search

**File: `src/components/ProjectsScreen.tsx`** (in the All tasks view)

At the top of the All tasks view (below the segmented control), add a search bar:
```tsx
<input
  type="search"
  placeholder="Поиск задач..."
  value={searchQuery}
  onChange={e => setSearchQuery(e.target.value)}
  style={{
    width: '100%', height: '40px', borderRadius: '12px',
    background: 'var(--surface)', border: '1px solid var(--hairline)',
    padding: '0 14px', fontSize: '14px', color: 'var(--text)',
    fontFamily: 'inherit', outline: 'none',
  }}
/>
```

Filter logic: when `searchQuery.trim()` is non-empty, flatten all tasks from the `grouped` record, filter by `title.toLowerCase().includes(query)`, and render results as a flat list (no date grouping, show date as subtitle on each row).

---

## STEP 9 — Update MobileApp.tsx

**File: `src/components/MobileApp.tsx`**

- Import `ProjectsScreen` and `AddProjectModal`
- Replace the Tasks tab (`{ id: 'tasks', ... }`) with a Projects tab:
  ```typescript
  { id: 'projects', Icon: ProjectsTabIcon, label: 'Work' }
  ```
- Add `ProjectsTabIcon` SVG (briefcase icon):
  ```tsx
  const ProjectsTabIcon = ({ color }: { color: string }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
    </svg>
  )
  ```
- Update `Tab` type: replace `'tasks'` with `'projects'`
- Update `showFab` condition to include `'projects'`
- Add `[addProjectModalOpen, setAddProjectModalOpen]` state
- Add `ProjectsScreen` panel (pass `tasks={grouped}` + all handlers)
- Add `AddProjectModal` portal

Pass `onAddProject={() => setAddProjectModalOpen(true)}` to ProjectsScreen.

---

## STEP 10 — Verification

```bash
cd /Users/shualy/Desktop/Planer && npx tsc --noEmit 2>&1
```

Must be clean. Fix any TypeScript errors before finishing.

Output final summary:
```
✅ BUILD CLEAN

## Files created
- src/components/ProjectsScreen.tsx
- src/components/AddProjectModal.tsx

## Files modified
- src/services/supabase.ts — new types/constants
- src/store/taskStore.ts — projects slice
- src/components/AddTaskModal.tsx — project/status/priority/estimate pickers
- src/components/TasksScreen.tsx — status+priority badges in TaskRow
- src/components/MobileApp.tsx — Projects tab wired up

## SQL to run in Supabase (paste this first)
[paste the SQL block from STEP 1]
```

---

## STOP CONDITIONS
- STOP if adding a new npm package is needed — ask first
- STOP if Supabase schema change isn't in the SQL block above
- STOP if TypeScript errors persist after 2 fix attempts

## FORBIDDEN
- Do NOT touch `src/index.css` design tokens
- Do NOT change CalendarScreen, AssistantScreen, NotesScreen, SettingsScreen
- Do NOT add a separate router library — all navigation is state-based
- Do NOT add real-time subscriptions
- Keep all existing task functionality working
