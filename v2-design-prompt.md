# Claude Design — Dino Task v2: Strict Work UI

## Project context
iOS-first mobile PWA task planner. React 18 + TypeScript.
Repo: https://github.com/shualyyy/planner
Pivoting to work-focused audience — individual professionals, not teams.

---

## Design direction: STRICT PROFESSIONAL

Previous version was too soft, rounded, playful. New direction:

**Visual language:**
- Dark OLED base: #0A0A0F
- Less frosted glass → more solid surfaces with subtle borders
- Corner radius: KEEP existing rounding — cards 20-24px, sheets 28px top, chips 999px pill. Do NOT make corners sharper.
- Typography more structured: tight line-height, tabular numbers
- Color: near-monochrome with ONE strong accent (electric blue #4A9EFF for interactive)
- Status colors as chips only — no color flooding backgrounds
- Grid-based layouts, clear vertical rhythm
- No emojis in UI. Icons only (SF Symbol style stroke SVGs)
- Headers: Fraunces serif for display numbers/titles, Inter for everything else
- Spacing: generous but deliberate — not airy, structured

**Feel reference:** Linear.app meets Apple Notes dark mode meets Craft.do — but with soft Apple-style rounded corners throughout

---

## Screens to design (6 screens, iPhone 14 Pro frame, Dark mode only)

---

### SCREEN 1 — Tasks tab (main, redesigned strict)

**Header area (compact):**
- "Tasks" label: 11px uppercase Inter 600, letter-spacing 0.12em, rgba(255,255,255,0.4)
- Date: "Monday, 30 June" in Fraunces 32px ivory #F0ECE3
- Right side: avatar circle (2-letter initials) in small dark chip

**Habits strip (NEW — top of task list, below header):**
A horizontal scrollable row of habit chips. Each chip:
- Dark solid background #16161E, border 1px rgba(255,255,255,0.10)
- Border-radius 10px, height 36px, padding 0 14px
- Icon (stroke, 14px) + habit name (12px Inter 500 white)
- Right side: small green checkmark circle if done today, empty circle if not
- Tapping the whole strip OR a "Привычки →" link opens the Habits Sheet (Screen 2)

Example habits shown: "🏃 Пробежка", "💊 Витамины", "📖 Чтение"
Done today: Пробежка ✓ | Not done: Витамины ○ | Not done: Чтение ○

**"Привычки →" button:**
Small text button right-aligned above the strip: "Привычки · 1/3 →" in 11px muted blue.
Tapping opens full Habits Sheet.

**Task list (below habits strip):**
Section header "Сегодня" — 10px uppercase muted, left-aligned
Tasks in a solid dark card #111118, border 1px rgba(255,255,255,0.07), radius 14px
Each task row (no dividers — use 8px spacing between rows instead):
- Left: status circle (empty = todo, half = in progress, filled = done)
- Title: 14px Inter 500 white
- Right side: project color dot (4px) + priority chip if High ("↑" in red 10px)
- Below title: time chip "14:00" in gray + label chip "Work" in category color

No swipe actions shown in design — keep rows clean.

**Section "Завтра" below with same pattern, slightly dimmed.**

---

### SCREEN 2 — Habits Sheet (opens over Tasks, NOT a new tab)

This is a bottom sheet that slides up over Screen 1. Height: 85vh.

**Sheet header:**
Drag handle (centered top)
"Привычки" — Fraunces 28px ivory
"Июнь 2026" — 12px muted right
Close × button top right

**Streak summary row (below header):**
3 inline metric chips in a horizontal row:
- "🔥 7 дней" (current streak)
- "✓ 18/30" (this month)
- "⚡ 3 активных" (habit count)
Each chip: dark solid bg, 1px border, 10px uppercase label + value in white

**Habit list:**
Each habit as a card row:
- Left: colored icon square (14x14, rounded 6px) — color unique per habit
- Habit name: 15px Inter 600 white
- Subtitle: "Ежедневно · Утро" in 11px muted
- Right side: 7 small day circles (Mon–Sun, current week)
  - Done day: filled circle in habit color
  - Today: outlined circle in habit color (pulse animation concept)
  - Future: empty gray circle
  - Miss: red dot center
- Far right: today's main checkbox (28px circle, border 1.5px)

Show 3 habits with different states:
1. "Спорт" (blue) — streak 7, all week done ✓✓✓✓✓✓○ (today not yet)
2. "Чтение" (amber) — streak 3, ✓✗✓✓✓○○ (missed Tuesday)
3. "Витамины" (green) — streak 1, ✗✗✗✗✓○○

**Bottom of sheet:**
"+ Добавить привычку" — outlined button, full width, 48px, dashed border style

---

### SCREEN 3 — Projects tab (REDESIGNED, more sophisticated)

**Header:**
"Работа" — Fraunces 34px ivory
"5 проектов · 23 задачи" — 12px muted below
Right: filter icon (funnel SVG) + "Все" text

**Project list (NOT cards — use LIST with left accent bar):**

Each project row styled as a structured card:
- Full-width card, height ~88px, background #111118, border-radius 20px, margin-bottom 10px
- Left accent bar: 3px wide, full height (inside card, rounded left), project color
- Inside (3-column grid):
  LEFT: project name 15px Inter 600 white, below: category tag "Dev · 8 задач"
  CENTER: mini progress bar (80px wide, 3px height) with "62%" label below in 10px
  RIGHT: status breakdown — 3 tiny colored squares stacked:
    ■ 3 In Progress (blue)
    ■ 2 Blocked (red)  
    ■ 5 Done (green)
  + "›" chevron

Show 4 projects with varying states. Last item: archived, dimmed 40%.

**"+ Новый проект" — sticky bottom bar (above tab bar):**
Full width, solid electric blue #4A9EFF, height 52px, white text "Новый проект", radius 14px.

---

### SCREEN 4 — Project Detail (after tapping a project row)

**Header:**
Back "← Работа" link (electric blue, 13px)
Project name "Mobile App" — Fraunces 30px ivory
Color indicator dot (6px) inline with name
"Edit ···" button top right (3-dot menu)

**Stats bar (4 metrics, horizontal, solid dark card):**
| 12 задач | 3 в работе | 2 blocked | 62% done |
Each separated by 1px vertical divider. Numbers in white 18px bold, labels 9px muted.

**Kanban-style status columns (horizontal scroll):**
4 columns visible (slightly peek 4th):
- Column header: status icon + name + count chip
- Each task as a compact card:
  - Title 13px white
  - Priority dot (left of title)
  - Time estimate chip bottom right "2h"
  - Assignee (single avatar circle, placeholder)

Columns: ○ To Do (3) | ◑ In Progress (3) | ⊘ Blocked (2) | ● Done (4)

**Alternative list view toggle (top right icon):** grid icon vs list icon

---

### SCREEN 5 — Add Task Sheet (strict version)

Bottom sheet, compact, professional.

**Handle + header row:**
"Новая задача" 11px uppercase muted | "Отмена" blue link right

**Title input:**
Fraunces 24px, placeholder "Название задачи..." no border, full width
Below: subtitle input 13px Inter muted, "Описание (необязательно)"

**Metadata rows (stacked, each 44px height, border-bottom divider):**

Row 1: 📁 icon "Проект" label left → project pill right (color dot + name "Mobile App")
Row 2: ○ "Статус" label left → status chip right "To Do" in gray
Row 3: ↑ "Приоритет" label left → priority chip right "High" in red tint
Row 4: ⏱ "Оценка" label left → time chips right "—" or selected "2ч"
Row 5: 📅 "Дата" label left → date chip right "Сегодня"
Row 6: 🔔 "Время" label left → time chip right "14:00"

Each row tappable — expands inline picker below OR opens sub-sheet.

**Save button:** solid blue, "Добавить задачу", full width, 52px, radius 12px.

---

### SCREEN 6 — Calendar tab (strict version, for reference)

Same calendar but stricter:

**Header:** "Июнь 2026" Fraunces 32px ivory | Prev/Next arrows in dark chips | "1d / 3d / 30d" toggle right
**Calendar grid:** darker cells, thinner grid lines, today highlighted with blue border only (not filled)
**Events in 1d view:** solid colored bars (not gradient), left border stripe only, tight padding

Show 1d time grid with 3 events in different projects showing colored left stripes.

---

## Component specs for developer handoff (add as annotation layer)

**Habit chip states:** unchecked, checked, hover
**Task row states:** todo, in-progress, blocked, done
**Project row states:** active, archived, selected
**Button states:** default, pressed, disabled

---

## What NOT to do
- No gradients on text
- No large emoji in UI elements
- No heavy shadows (use borders only)
- Keep rounded corners everywhere — do not make anything sharp or square
- No colorful backgrounds — color only for accents and status indicators
- No animations described — focus on static states
- Don't make it look like Notion or ClickUp — keep it minimal, not feature-packed visually

---

## Deliverable
6 screens in iPhone 14 Pro frame. Dark mode only. One additional component reference sheet.
All text in Russian where UI copy, English for technical labels (Status, Priority).
