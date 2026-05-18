# Planer v2 — Full UI Redesign Prompt for Claude Code

## Context (carry forward)
- Repo: `~/Desktop/Planer` — React 18 + TypeScript + Vite PWA, iOS-first
- Backend: Supabase (auth + tasks table). Task type lives in `src/services/supabase.ts`
- State: Zustand store in `src/store/taskStore.ts`
- AI: Groq via `src/services/aiService.ts`
- Entry: `src/components/MobileApp.tsx` (5-tab app, tab bar via createPortal)
- All screens already exist; this is a visual redesign, NOT a logic rewrite

## Starting state
The app uses a warm terracotta design (v1): Inter font only, flat task rows, simple calendar chips, placeholder Wins screen, basic Settings. All logic (Supabase CRUD, toggleDone, AI chat, speech recognition) works correctly.

## Target state
Implement the **Planer v2 design** exactly as described below. Every pixel detail matters. Do not invent — follow the spec.

---

## STOP CONDITIONS — read before touching anything

- **STOP and ask** before adding any new npm package
- **STOP and ask** before modifying `src/services/supabase.ts` Task interface fields that map to DB columns
- **STOP and ask** before touching `src/services/aiService.ts`
- **NEVER** remove or break existing Supabase CRUD logic, toggleDone, or speech recognition
- **NEVER** rewrite MobileApp.tsx logic — only update styling of the tab bar
- Only make changes directly requested. Do not add features not in this spec.

---

## STEP 1 — Fonts: add Fraunces to index.html

In `index.html`, update the Google Fonts link to load both Inter and Fraunces:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Inter:wght@400;450;500;550;600;700&display=swap"/>
```

---

## STEP 2 — Design tokens: replace ALL of `src/index.css`

Replace the entire file with the following (preserve the keyframe animations `blink`, `micPulse`, `ping`, `spin` that already exist — add them back at the bottom):

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Inter:wght@400;450;500;550;600;700&display=swap');

/* ── Design tokens ── */
:root, [data-theme="light"] {
  --font-sans:    'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif:   'Fraunces', 'Inter', serif;

  --bg:           #F5F1EC;
  --bg-2:         #EDE7DF;
  --surface:      #FFFFFF;
  --surface2:     #F5F1EC;
  --border:       #E4DED5;
  --hairline:     rgba(28,25,23,0.06);
  --text:         #1C1917;
  --text-2:       #6B6360;
  --text-muted:   #A89E9A;
  --text-faint:   #C8C0BC;
  --accent:       #E8845A;
  --accent-2:     #D97757;
  --accent-soft:  #F5E6DF;
  --accent-ink:   #4A2418;
  --accent-glow:  rgba(232,132,90,0.32);
  --success:      #4F9E7E;
  --success-soft: #DDEDE3;
  --danger:       #DA5454;
  --danger-text:  #DA5454;
  --danger-soft:  rgba(218,84,84,0.10);
  --danger-border: rgba(218,84,84,0.25);
  --info:         #2563eb;
  --info-hover:   #3b82f6;
  --shadow:       rgba(0,0,0,0.08);

  --ev-0: #B8D4F2;
  --ev-1: #F5BDD0;
  --ev-2: #F5E28A;
  --ev-3: #8ED4C8;
  --ev-4: #C8B4E8;
  --ev-5: #A8D8B0;
  --ev-ink: #1C1917;

  --tabbar-bg:     rgba(255,255,255,0.78);
  --tabbar-stroke: rgba(28,25,23,0.06);
  --tabbar-shadow: 0 12px 36px rgba(74,36,24,0.10), 0 1px 0 rgba(255,255,255,0.9) inset;
  --sheet-shadow:  0 -8px 40px rgba(0,0,0,0.16);
  --card-shadow:   0 0 0 0.5px var(--hairline);

  --panel:       var(--surface);
  --panel-2:     var(--surface2);
  --border-soft: var(--border);
  --shadow-lg:   0 30px 80px rgba(0,0,0,0.12);
  --hover-overlay: rgba(0,0,0,0.04);
  --danger-text-2: #fca5a5;
  --danger-soft-2: rgba(218,84,84,0.13);
}

[data-theme="dark"] {
  --bg:           #0F0D0B;
  --bg-2:         #16130F;
  --surface:      #1B1714;
  --surface2:     #221D19;
  --border:       #2A231F;
  --hairline:     rgba(255,255,255,0.06);
  --text:         #F2EBE6;
  --text-2:       #A89E9A;
  --text-muted:   #6B6360;
  --text-faint:   #3A3431;
  --accent:       #E8845A;
  --accent-2:     #F0976F;
  --accent-soft:  rgba(232,132,90,0.16);
  --accent-ink:   #FFE5D6;
  --accent-glow:  rgba(232,132,90,0.40);
  --success:      #6DBF9A;
  --success-soft: rgba(109,191,154,0.14);
  --danger:       #E47474;
  --danger-text:  #E47474;
  --danger-soft:  rgba(228,116,116,0.12);
  --danger-border: rgba(228,116,116,0.25);
  --info:         #3b82f6;
  --info-hover:   #60a5fa;
  --shadow:       rgba(0,0,0,0.30);

  --ev-0: #6E94BD;
  --ev-1: #B98599;
  --ev-2: #BFA958;
  --ev-3: #5BA294;
  --ev-4: #9783BD;
  --ev-5: #6FA579;
  --ev-ink: #0F0D0B;

  --tabbar-bg:     rgba(27,23,20,0.78);
  --tabbar-stroke: rgba(255,255,255,0.08);
  --tabbar-shadow: 0 12px 36px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset;
  --sheet-shadow:  0 -8px 40px rgba(0,0,0,0.5);
  --card-shadow:   0 0 0 0.5px var(--hairline);

  --panel:       var(--surface);
  --panel-2:     var(--surface2);
  --border-soft: var(--border);
  --shadow-lg:   0 30px 80px rgba(0,0,0,0.5);
  --hover-overlay: rgba(255,255,255,0.04);
  --danger-text-2: #fca5a5;
  --danger-soft-2: rgba(228,116,116,0.13);
}

/* ── Base ── */
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
html, body, #root { height: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.005em;
  overflow: hidden;
}
button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; padding: 0; }
input, textarea { font-family: inherit; color: inherit; }

@media (max-width: 767px) { body { -webkit-text-size-adjust: 100%; } }
::-webkit-scrollbar { width: 0; display: none; }

/* ── Tab bar ── */
.tabbar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: max(env(safe-area-inset-bottom, 0px), 10px);
  width: 312px;
  height: 56px;
  border-radius: 28px;
  background: var(--tabbar-bg);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  box-shadow: var(--tabbar-shadow), 0 0 0 0.5px var(--tabbar-stroke);
  display: flex;
  align-items: stretch;
  padding: 0 6px;
  z-index: 400;
}
.tab {
  flex: 1;
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  color: var(--text-muted);
  transition: color 0.2s, transform 0.15s;
  position: relative;
}
.tab.on { color: var(--accent); }
.tab:active { transform: scale(0.88); }
.tab .tab-label {
  font-size: 9.5px;
  font-weight: 550;
  letter-spacing: 0.02em;
  margin-top: 2px;
  opacity: 0;
  transform: translateY(-3px);
  transition: opacity 0.2s, transform 0.2s;
  line-height: 1;
}
.tab.on .tab-label { opacity: 1; transform: translateY(0); }
.tab.on .tab-icon { transform: translateY(-1px); }
.tab-icon { transition: transform 0.2s; }

/* ── FAB ── */
.fab-v2 {
  position: fixed;
  bottom: calc(max(env(safe-area-inset-bottom, 0px), 10px) + 72px);
  right: 22px;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 1px 0 rgba(255,255,255,0.25) inset, 0 8px 24px var(--accent-glow);
  z-index: 350;
  transition: transform 0.15s;
}
.fab-v2:active { transform: scale(0.92); }

/* ── Segment pills (calendar view switcher) ── */
.seg {
  display: inline-flex;
  background: var(--surface);
  border-radius: 999px;
  padding: 3px;
  box-shadow: var(--card-shadow);
}
.seg-pill {
  border: none;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 11.5px;
  font-weight: 550;
  cursor: pointer;
  background: transparent;
  color: var(--text-muted);
  transition: all 0.2s;
  font-family: inherit;
  letter-spacing: 0.02em;
}
.seg-pill.on {
  background: var(--text);
  color: var(--bg);
}

/* ── Calendar ── */
.cal-body { flex: 1; min-height: 0; padding: 0 14px 8px; display: flex; flex-direction: column; overflow: hidden; }
.weekdays { display: grid; grid-template-columns: repeat(7, 1fr); padding: 0 14px 8px; gap: 2px; }
.wd { text-align: center; color: var(--text-muted); font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.days30 { display: grid; grid-template-columns: repeat(7, 1fr); padding: 0 14px; gap: 2px; }
.d30 {
  aspect-ratio: 1;
  border-radius: 12px;
  display: flex; flex-direction: column;
  padding: 6px 6px 5px;
  background: transparent;
  position: relative;
  transition: background 0.15s, transform 0.15s;
  border: none;
  cursor: pointer;
}
.d30:active { transform: scale(0.92); }
.d30.other { pointer-events: none; }
.d-num { font-size: 13px; font-weight: 500; font-variant-numeric: tabular-nums; color: var(--text); line-height: 1; }
.d30.other .d-num { color: var(--text-faint); }
.d30.today { background: var(--text); }
.d30.today .d-num { color: var(--bg); font-weight: 600; }
.d30.today .d-dot { background: var(--bg) !important; opacity: 0.7; }
.d-dots { display: flex; gap: 2px; margin-top: auto; justify-content: center; }
.d-dot { width: 4px; height: 4px; border-radius: 50%; }

/* ── Settings cards ── */
.settings-card { background: var(--surface); border-radius: 18px; overflow: hidden; margin-bottom: 8px; box-shadow: var(--card-shadow); }
.settings-row { display: flex; align-items: center; gap: 14px; padding: 14px 18px; cursor: pointer; border: none; width: 100%; text-align: left; background: transparent; color: var(--text); }
.settings-row + .settings-row { border-top: 1px solid var(--hairline); }
.settings-divider { height: 1px; background: var(--hairline); }
.settings-section-label { font-size: 10.5px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.14em; padding: 16px 6px 8px; }
.set-icon { width: 32px; height: 32px; border-radius: 10px; background: var(--surface2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--text-2); }

/* ── Date/time picker icons ── */
input[type="date"]::-webkit-calendar-picker-indicator,
input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
[data-theme="light"] input[type="date"]::-webkit-calendar-picker-indicator,
[data-theme="light"] input[type="time"]::-webkit-calendar-picker-indicator { filter: none; }

/* ── Animations ── */
@keyframes blink {
  0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-2px); }
}
@keyframes micPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(232,132,90,0.4); }
  50% { box-shadow: 0 0 0 5px rgba(232,132,90,0); }
}
@keyframes ping {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.5); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pop {
  0% { transform: scale(0.6); }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## STEP 3 — Labels system: add to `src/services/supabase.ts`

Add the label type ABOVE the Task interface (do NOT change Task interface DB columns):

```typescript
export type TaskLabel = 'work' | 'personal' | 'health' | 'family' | 'travel'

export const TASK_LABELS: Record<TaskLabel, { name: string; color: string }> = {
  work:     { name: 'Work',     color: '#B8D4F2' },
  personal: { name: 'Personal', color: '#F5BDD0' },
  health:   { name: 'Health',   color: '#8ED4C8' },
  family:   { name: 'Family',   color: '#F5E28A' },
  travel:   { name: 'Travel',   color: '#C8B4E8' },
}
```

Also add `label?: TaskLabel` as an optional field to the Task interface (this maps to the existing `description` field client-side — parse it on fetch, or store separately; do NOT add a new Supabase column). Implementation: store label as a prefix in description: `"[work] actual description"`. Parse on read, strip on write. If description has no bracket prefix, label defaults to `'personal'`.

---

## STEP 4 — Update `src/components/icons.tsx`

Add these new exports (keep all existing ones):

```typescript
// Fraunces-compatible icons for v2
export const IcoPlus = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
)
export const IcoBell = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
)
export const IcoLock = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2.5"/><path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
)
export const IcoHelp = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
  </svg>
)
export const IcoFire = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 14s1.5-3 4-3c0 0-1-2 0-4 1-2 4-3 4-3s0 2 1.5 3.5S20 11 20 14a8 8 0 11-16 0c0-2 2-3 2-5 0 0 1 1 2 1.5"/>
  </svg>
)
export const IcoClock = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
  </svg>
)
export const IcoTag = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)
export const IcoChevronDown = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6"/>
  </svg>
)
```

---

## STEP 5 — Update `src/components/MobileApp.tsx` (tab bar only)

The tab bar `<button>` elements need `className="tab"` plus `.on` for active. Add a `<span className="tab-icon">` wrapper around the Icon and a `<span className="tab-label">` below. Tab labels: Calendar→"Today", Tasks→"Tasks", Assistant→"Ask", Wins→"Wins", Settings→"You".

Keep the createPortal approach. Keep all existing logic intact. Only change tab button JSX to:

```tsx
<button key={id} className={`tab${active ? ' on' : ''}`} onClick={() => setTab(id)}>
  <span className="tab-icon">
    <Icon color={active ? 'var(--accent)' : 'var(--text-muted)'} />
  </span>
  <span className="tab-label">{LABEL}</span>
</button>
```

Replace the FAB in TasksScreen (which is `position: absolute`) with the new `.fab-v2` class button inside MobileApp, rendered as a portal or fixed element — positioned fixed, bottom above tab bar, right: 22px. Show FAB only on calendar and tasks tabs. FAB uses `<IcoPlus size={22} />` icon.

---

## STEP 6 — Rewrite `src/components/CalendarScreen.tsx`

**Header section** (replace the old flat header):
```
padding: 20px 24px 18px
eyebrow row: left = "h-eyebrow" text "This month" (uppercase, 10px, tracking 0.14em, --text-muted)
             right = segment pills (30d / 3d / 1d) using `.seg` / `.seg-pill` CSS classes
month row: left = month name in Fraunces serif 34px weight 500, color --text + year in Inter 14px/500/--text-muted
           right = chevron nav buttons (28x28px, transparent bg, rounded 8px)
```

**30d grid changes:**
- Day cells use `.d30` class with `aspect-ratio: 1`
- Today cell: `background: var(--text)`, number color `var(--bg)` — NOT accent-soft
- Event indicators: colored dots (4×4px circles) using task label colors, max 3 dots, gap 2px, centered below number
- No text chips inside cells — dots only

**Upcoming section** (NEW — add below the grid, inside the scroll area):
```
padding: 20px 24px 0
heading: left "Up next" (16px/600, --text), right "[N] events" (10px/600/uppercase/--text-muted)
list of upcoming tasks (future + today, not done, has time) sorted by date+time, max 4
each row (.up-row): white card, radius 16px, card-shadow, padding 14px, flex row
  - date column (38px wide): Fraunces 22px number + DOW abbr (10px/600/uppercase/--text-muted) below
  - body: title (500 14px --text) + meta row (label color dot 6px + label name + · + time)
```

**DayPopup** (bottom sheet, keep createPortal into body):
- Sheet heading: Fraunces 36px number + Inter 11px/600/uppercase label in a flex row
- Task rows inside popup same as TaskRow component
- "Add task" button: full width, height 52px, border-radius 18px, background --accent, white text, 15px/600, box-shadow: `0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 24px var(--accent-glow)`

---

## STEP 7 — Rewrite `src/components/TasksScreen.tsx`

**Hero section** (replaces plain "Tasks" header):
```tsx
<div style={{ padding: '24px 24px 10px', position: 'relative', zIndex: 1 }}>
  {/* Eyebrow */}
  <div style={{ font: '600 10.5px Inter,sans-serif', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--accent)', marginBottom: 10 }}>
    {greeting}  {/* "Good morning" | "Good afternoon" | "Good evening" */}
  </div>
  {/* Headline in Fraunces serif */}
  <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 44, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 16 }}>
    {doneToday === totalToday && totalToday > 0
      ? <><em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>All done.</em></>
      : <>{totalToday - doneToday} left for <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>today</em></>
    }
  </h1>
  {/* Progress bar */}
  <div style={{ height: 6, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden', boxShadow: 'var(--card-shadow)', marginBottom: 6 }}>
    <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg, var(--accent-2), var(--accent))', borderRadius: 999, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
  </div>
  <div style={{ font: '450 12.5px Inter,sans-serif', color: 'var(--text-2)' }}>
    <b style={{ color: 'var(--text)', fontWeight: 600 }}>{doneToday}</b> of <b style={{ color: 'var(--text)', fontWeight: 600 }}>{totalToday}</b> done · {pct}%
  </div>
</div>
```

**Task group sections:**
- Section heading row: left = day title (15px/600/--text/-0.01em), right = date meta (12px/450/--text-muted)
- "Today" for today's date, "Tomorrow" for tomorrow, weekday name for others
- Card container: `background: var(--surface); border-radius: 18px; overflow: hidden; box-shadow: var(--card-shadow)`
- Row divider: `border-top: 1px solid var(--hairline)` (not margin-inset)

**TaskRow redesign:**
```
padding: 16px 18px
checkbox: 22px circle, border 1.5px --border, on-done: fill --accent + box-shadow: 0 0 0 4px var(--accent-soft) + pop animation
task-body flex column:
  title: 14.5px/500/--text/-0.005em, done: --text-muted + line-through 1.2px
  meta row: label-dot (6px circle, label color) + label name (11.5px/450/--text-muted) + "All day" if is_all_day
time chip (right): 11.5px/550, padding 4px 9px, radius 999px, bg: var(--surface2), color: var(--text-2)
  — if task is within 90 min: bg: var(--accent-soft), color: var(--accent-2) ("near" state)
```

**Label for tasks:** Read from task's description field using the `[label]` prefix convention. Default to `'personal'` if no prefix. The meta dot uses the label color from `TASK_LABELS`.

**Pop animation on checkbox:** when toggling from undone→done, apply `animation: pop 0.3s cubic-bezier(0.4,0,0.2,1)` to the checkbox div for 350ms then remove.

**Empty state:** "Nothing scheduled. Enjoy the quiet." centered, 13.5px/450/--text-muted, no emoji.

---

## STEP 8 — Rewrite `src/components/AssistantScreen.tsx` (visual only, keep all AI/speech logic)

**Hero header** (replaces the green dot header):
```
padding: 28px 24px 12px
greeting: Fraunces 28px/500, line-height 1.1, letter-spacing -0.025em
  "Good {morning|afternoon|evening}.\nWhat's on your mind?"
  the word after "What's" is italic + --accent colored: <em style="font-style:italic;color:var(--accent)">on your mind</em>
```

**Chat bubbles:**
- User bubble: `background: var(--text); color: var(--bg); border-radius: 20px 20px 6px 20px; padding: 12px 16px; max-width: 80%; font: 400 14px/1.5 Inter; letter-spacing: -0.005em`
- AI bubble: `background: var(--surface); color: var(--text); border-radius: 20px 20px 20px 6px; box-shadow: var(--card-shadow)` same padding/font
- No SparkleIcon avatar on AI bubbles — remove it (keep it simple)
- When AI adds a task (parsedTask comes back from sendMessage), also render an "action bubble":
  ```
  AI bubble with extra border: border: 1.5px solid var(--accent-soft); background: var(--bg-2)
  Inside: "Added to your calendar." in 13px/450/--text-2
  Then a card row: bg --surface, radius 12px, padding 10px 12px, margin-top 6px, flex
    - pulse dot: 8px circle --accent, box-shadow: 0 0 0 3px var(--accent-soft)
    - title: 13px/550/--text
    - meta: 11.5px/450/--text-muted showing date + time
  ```

**Composer (input bar):**
```
margin: 6px 14px; border-radius: 24px; background: var(--surface); padding: 6px 6px 6px 18px;
box-shadow: var(--card-shadow); display flex align-items flex-end gap 8px
textarea: flex 1, bg transparent, border none, outline none, resize none, 14px/400/--text, min-height 24px, max-height 80px, padding 12px 0
mic button: 38px circle, bg var(--surface2), color var(--text-2)
send button: 38px circle, bg var(--text), color var(--bg); disabled: bg var(--surface2), color var(--text-muted)
```

**Suggestion chips:**
```
horizontal scroll row, gap 8px, padding 4px 18px 10px
each chip: bg var(--surface), border 1px solid var(--border), radius 999px, padding 8px 14px, 12.5px/500/--text-2
```

Keep ALL existing logic: sendMessage, fetchTasks, speech recognition, SpeechRecognition types, handleSend, toggleListening. Only replace the JSX/styles.

---

## STEP 9 — Rewrite `src/components/WinsScreen.tsx`

Full redesign (currently a placeholder):

```
Header section (padding 28px 24px 0):
  eyebrow: "Your week" (10.5px/600/uppercase/0.14em/--accent)
  headline: Fraunces 36px/500 "A quiet kind of winning." with "winning" in italic --accent
  sub: "N tasks done, M still in the pipeline." (14px/450/--text-2/line-height 1.5)

Streak card (.streak-card):
  bg: var(--surface), radius 22px, padding 24px, box-shadow: var(--card-shadow)
  pseudo ::after: radial glow top-right corner (var(--accent-soft))
  big number: Fraunces 64px/500/-0.04em, then "days" in 30px
  label: "Current streak" 11px/600/uppercase/0.14em/--text-2

Weekly bar chart (.week-card):
  bg: var(--surface), radius 22px, padding 22px, box-shadow: var(--card-shadow)
  heading: "Last 7 days" uppercase + "N/M done" right
  7-column grid: for each of last 7 days:
    - bar track: 100% wide, 60px tall, bg var(--surface2), radius 8px
    - bar fill: gradient linear(180deg, --accent-2, --accent), height = pct * 60px min 6px
      today's bar: box-shadow: 0 0 16px var(--accent-glow)
      0-task days: bg var(--border), height 4px
    - day label: 1-letter abbr (M T W T F S S), 10px/600/uppercase/--text-muted; today = --accent

Recent wins list (.recent-wins):
  bg: var(--surface), radius 22px, box-shadow: var(--card-shadow), overflow hidden
  3 rows, divider: border-top 1px solid var(--hairline), padding 14px 18px, gap 14px
  Each row: badge (32px circle) + body (title 13.5px/550/--text + meta 12px/450/--text-muted)
  Row 1: 🔥 orange badge (accent-soft bg), "Best week so far", "Highest completion rate in 30 days"
  Row 2: ✓ green badge (success-soft bg), "Morning routine kept", "5 days in a row"
  Row 3: ✦ orange badge, "Keep going", "You're building momentum"

Build the week data from real `tasks` prop (passed from MobileApp):
  last 7 days including today, count done/total per day, compute percentages
  sum for weekDone/weekTotal displayed in sub-headline
  streak = consecutive days (ending today) where at least 1 task was done — compute from tasks
```

Import `IcoFire` and `IcoFire` from icons. Use `CheckIcon` for the green badge.

---

## STEP 10 — Rewrite `src/components/SettingsScreen.tsx`

```
Header: Fraunces 36px/500/-0.03em "You" (replaces "Settings" h1)

Profile card:
  bg: var(--surface), radius 22px, padding 22px, box-shadow: var(--card-shadow)
  display flex, gap 16px, align-items center, margin-bottom 22px
  avatar: 52px circle, bg: linear-gradient(135deg, var(--accent), var(--accent-2))
    - shows first letter of email (uppercase)
    - color #fff, 18px/600
    - box-shadow: 0 4px 12px var(--accent-glow)
  info: email (12.5px/450/--text-muted), no name
  plan badge: "Free" uppercase, 10.5px/600/0.1em, padding 4px 10px, bg var(--accent-soft), color var(--accent-2), radius 999px

Appearance card (.settings-card):
  single row: set-icon (sun/moon based on theme) + "Theme" label + theme pills
  theme-pills: inline-flex, bg var(--surface2), radius 999px, padding 3px
    each pill: 38×30px, radius 999px, icon only (SunIcon / MoonIcon 15px)
    active: bg var(--surface), box-shadow 0 1px 3px rgba(0,0,0,0.08)

Notifications card:
  row 1: IcoBell set-icon + "Reminders" label + "15 min before" value + ChevronRight
  row 2: SparkleIcon set-icon + "Daily brief" label + "8:00 AM" value + ChevronRight

Account card:
  row 1: IcoLock set-icon + "Privacy" + ChevronRight
  row 2: IcoHelp set-icon + "Help & feedback" + ChevronRight
  row 3 (danger): IcoSignOut set-icon (danger-soft bg, danger color) + "Sign out" (danger color)
    — onClick: calls real Supabase signOut

Version: "Planer · v2.0" centered, 11px/450/--text-muted, padding 16px 0 28px
```

All rows use `.settings-row` class. Section labels use `.settings-section-label`. Icon squares use `.set-icon` class.

---

## STEP 11 — Rewrite `src/components/AddTaskModal.tsx`

The modal becomes a bottom sheet with Fraunces title input and meta-pills. Keep all Supabase save logic.

**Backdrop:** same as before — `rgba(0,0,0,0.45)` + `backdrop-filter: blur(8px)`, `opacity` transition

**Sheet container:**
```
width: 100%
bg: var(--bg)
border-radius: 28px 28px 0 0
padding: 12px 24px 28px
box-shadow: var(--sheet-shadow)
translateY(100%) → translateY(0) transition 0.35s cubic-bezier(0.32,0.72,0,1)
```

**Drag handle:** 40px × 5px, bg var(--border), radius 999px, centered, margin 0 auto 18px

**Sheet title:** Fraunces 24px/500/-0.025em/--text, margin-bottom 18px. Text: "New task" or "Edit task"

**Title input (BIG, replaces old bordered input):**
```
width: 100%
bg: transparent
border: none, outline: none
font-family: var(--font-serif), font-size: 22px, font-weight: 500
font-variation-settings: 'opsz' 24
color: var(--text), letter-spacing: -0.02em
padding: 4px 0 12px
border-bottom: 1px solid var(--border)
placeholder: color var(--text-faint), font-style italic
```

**Meta-pills rows (replaces date input + time inputs):**

Row 1 — Date selection (3 pills):
- "Today" pill (IcoCal 14px + "Today")
- "Tomorrow" pill
- "Next week" pill
Active pill: `background: var(--text); color: var(--bg)` (dark filled)
Inactive: `background: var(--surface); color: var(--text-2); box-shadow: var(--card-shadow)`

Row 2 — Time / All day:
- "All day" pill (IcoAllDay 14px — use a ➕ rotated or just a simple icon)
- Time pill showing current time value (IcoClock 14px + time string) — only when not all-day
  - Tapping the time pill opens a native `<input type="time">` (visually hidden, triggered via ref.click())

Row 3 — Label selection:
- One pill per label (5 labels: work, personal, health, family, travel)
- Each pill: 8px colored dot (the label color) + label name
- Active = dark fill

**Each meta-pill:**
```
display: inline-flex; align-items: center; gap: 6px
padding: 9px 14px; border-radius: 999px; border: none
font: 500 13px Inter; color: var(--text-2)
flex-shrink: 0; background: var(--surface); box-shadow: var(--card-shadow)
active: background: var(--text); color: var(--bg)
```

Meta-pill rows: `display: flex; gap: 8px; margin: 18px 0 0; overflow-x: auto; scrollbar-width: none`

**Save button:**
```
width: 100%; padding: 16px; border-radius: 18px; border: none
background: var(--accent); color: #fff; font: 600 15px Inter; letter-spacing: -0.005em
box-shadow: 0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 24px var(--accent-glow)
margin-top: 22px
text: "Add to calendar" (add mode) or "Save changes" (edit mode)
```

**When saving:** encode label into description as `[label] original_description`. When loading editTask, parse label from description prefix.

---

## STEP 12 — Update `src/components/MobileApp.tsx` for WinsScreen

Pass `tasks` to WinsScreen:
```tsx
<WinsScreen tasks={tasks.map(t => ({ ...t, done: donIds.has(t.id) }))} />
```

---

## Acceptance criteria

- [ ] App builds with `npm run build` with zero TypeScript errors
- [ ] All 5 screens render without runtime errors
- [ ] Tab bar shows animated label under active icon
- [ ] Today cell in calendar is dark-filled (var(--text) bg), not orange
- [ ] Tasks screen shows Fraunces hero headline + progress bar
- [ ] Add Task modal opens as a bottom sheet with Fraunces title input and meta-pills
- [ ] Wins screen shows real streak count + weekly bar chart from actual tasks
- [ ] Settings shows profile card with gradient avatar + sign-out works
- [ ] Theme toggle (light/dark) works on Settings screen
- [ ] No console errors in browser

## Forbidden

- Do NOT change any Supabase query logic
- Do NOT touch `src/services/aiService.ts`
- Do NOT add any npm packages
- Do NOT change the Zustand store logic
- Do NOT break speech recognition in AssistantScreen
