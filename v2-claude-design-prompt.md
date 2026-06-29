# Claude Design — Dino Task v2: Work UI Redesign

## Project
Dino Task — iOS-first mobile PWA task planner, now pivoted to work-focused audience.
React 18 + TypeScript + Vite. Existing repo: https://github.com/shualyyy/planner

## What changed in v2
New features added by developers:
- **Projects** — group tasks into work projects with color coding and progress
- **Task statuses** — Not Started / In Progress / Blocked / Done
- **Priority levels** — High / Medium / Low with color indicators
- **Time estimates** — 15m / 30m / 1h / 2h / 4h / 8h per task
- **Search** across all tasks
- Tab "Tasks" renamed to "Work" (briefcase icon)

## Design direction
Dark. Premium. Focused. Apple-adjacent — think Linear meets Notion meets iOS 17.
Reference aesthetic: dark OLED backgrounds (#0A0A0F), frosted glass cards, electric blue accent (#4A9EFF), generous white space, Fraunces serif for display text, Inter for UI.
NOT colorful. NOT playful. This is a serious work tool that happens to look beautiful.

---

## Screens to design (5 screens total in one iPhone 14 Pro frame set)

### Screen 1 — Projects (Work tab, default view)

**Header:**
Large Fraunces serif "Work" title (38px, ivory #F0ECE3), greeting line "Добрый день, Илья" in 10px uppercase muted label above it.
Top-right: avatar circle (initials "ИЛ") in glass pill — tapping opens Settings.

**Progress summary strip (below header):**
Glass card, 3 metrics inline:
- "5 проектов"
- "12 задач сегодня"  
- "3 в работе"
Each separated by faint vertical divider. Numbers in electric blue, labels in muted white.

**Project cards (scrollable list):**
Each card: frosted glass surface (rgba(255,255,255,0.06)), border-radius 20px, 1px glass border.
- Left edge: 3px colored stripe (project color)
- Project name: 16px bold white
- Description: 12px rgba(255,255,255,0.45), 1 line truncated
- Bottom row: progress bar (thin, colored) + "4/7 задач" + "2 в работе" chip
- Tap zone: entire card

**Empty state:** Centered icon (briefcase in dashed circle), "Создай первый проект" in muted text, large glass "+" button.

**FAB (bottom right, above tab bar):** Electric blue circle with "+" — creates new project.

---

### Screen 2 — Project Detail (after tapping a project)

**Header:**
Back arrow (left) + Project name in Fraunces serif (28px) + color dot.
"Edit" text button (right, muted).
Below header: thin progress bar spanning full width, colored in project color. "4 of 7 done · 57%" label.

**Status sections (accordion-style):**
Four sections, each collapsible:
- **○ To Do** (3) — gray label
- **◑ In Progress** (2) — blue label  
- **⊘ Blocked** (1) — red label
- **● Done** (4) — green label, tasks shown with strikethrough and reduced opacity

**Task row inside detail:**
- Priority dot (left): red=high, amber=medium, gray=low (5px circle)
- Task title (14px, white)
- Time estimate chip: "2h" in tiny glass pill (right)
- Swipe left: Edit (blue) + Delete (red) — same as v1

**FAB:** "+ Задача" text button in glass pill at bottom center, electric blue.

---

### Screen 3 — Add Task Sheet (bottom sheet, work version)

Same sliding bottom sheet as v1 but with new sections.

**Layout (top to bottom):**
1. Drag handle
2. "Новая задача" label (uppercase, 10px muted) + close button
3. Large Fraunces serif text input "Что нужно сделать?" (placeholder)
4. **Project row:** Horizontal scroll of project color pills — "Без проекта" (ghost) + one pill per project
5. **Status row:** 4 glass pills — ○ To Do · ◑ In Progress · ⊘ Blocked · ● Done. Active pill gets status color background.
6. **Priority row:** 3 pills — ↑ High (red tint) · — Medium (amber tint) · ↓ Low (gray). Active tinted.
7. **Estimate row:** 6 compact pills — 15м · 30м · 1ч · 2ч · 4ч · 8ч
8. **Date row:** Today · Tomorrow · Next week · ··· (same as v1)
9. **Time row:** same as v1
10. **Save button:** full-width, electric blue, "Добавить задачу"

Sheet should feel compact — all sections fit without scrolling on iPhone 14 Pro.

---

### Screen 4 — Search (inside Work tab, All Tasks view)

**Top:** Segmented control "Проекты | Все задачи" — All Tasks selected.

**Search bar:** Full-width glass pill, magnifier icon (left), "Поиск задач..." placeholder, clear X button (right). Keyboard shown.

**Search results (with query "дизайн"):**
Results appear as flat list (no date grouping). Each result row:
- Task title with matched text highlighted in electric blue
- Below: project color dot + project name + date chip ("Сегодня", "Пт 27", etc.)
- Status icon on right

**Empty search:** Magnifier icon + "Ничего не найдено" + suggestion to try another query.

---

### Screen 5 — Task Row States (component showcase)

A single screen showing 5 task row variations in a card list, for developer handoff:

1. **Not Started + Low priority** — gray priority dot, no status badge visible
2. **In Progress + High priority** — red priority dot, "◑ In Progress" in blue text on right
3. **Blocked + High priority** — red dot, "⊘ Blocked" in red text, title slightly dimmed
4. **Done** — green checkmark, strikethrough title, 0.5 opacity row
5. **Done + recurring** — same as done but with "↻ Daily" chip in gray

All rows inside one dark glass card. This screen is for developers to see exact spacing and states.

---

## Design system (carry forward from v1 + additions)

**Colors:**
- Background: #0A0A0F with deep indigo radial glow at top
- Surface cards: rgba(255,255,255,0.06), border 0.5px rgba(255,255,255,0.12)
- Electric blue: #4A9EFF (primary accent, In Progress)
- Success green: #3CC68A (Done)
- Danger red: #D94F4F (Blocked, High priority)
- Amber: #C8A84B (Medium priority)
- Text primary: #FFFFFF
- Text secondary: rgba(255,255,255,0.50)
- Text muted: rgba(255,255,255,0.30)

**Project palette (8 colors, shown as swatches in AddProjectModal):**
#4A9EFF · #3CC68A · #D94F4F · #C8A84B · #9B7ACC · #D97757 · #8ED4C8 · #F5BDD0

**Typography:**
- Display: Fraunces 500 (serif), ivory #F0ECE3
- UI: Inter, white/muted
- Labels: Inter 10px uppercase, 0.14em tracking

**Components:**
- Status pills: icon + name, active = status color at 15% opacity background + full color text + 1px colored border
- Priority dots: 5px circles, inline before title
- Progress bars: 4px height, rounded, colored, on dark background rgba(255,255,255,0.08)
- Glass cards: backdrop-blur(20px), no heavy shadow — use border only
- Tab bar: same floating dark pill as v1

---

## Technical requirements
- All 5 screens in iPhone 14 Pro frame (Dynamic Island visible)
- Dark mode only, OLED-friendly background
- Deliver as exportable Figma-ready components
- All text in Russian (UI labels) or mixed Ru/En as shown above
- Generate both the screens AND a component-level view (Screen 5)
