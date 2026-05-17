# Code Review & Fix — Planer PWA

Run `tsc --noEmit` first to get the full list of TypeScript errors, then read every file listed below and fix ALL issues you find. Do not ask for confirmation — just fix everything and run `npm run build` at the end to verify zero errors.

---

## Files to review (read all of them)

```
src/App.tsx
src/main.tsx
src/index.css
src/store/taskStore.ts
src/services/supabase.ts
src/services/aiService.ts
src/components/MobileApp.tsx
src/components/CalendarScreen.tsx
src/components/TasksScreen.tsx
src/components/AssistantScreen.tsx
src/components/SettingsScreen.tsx
src/components/WinsScreen.tsx
src/components/AddTaskModal.tsx
src/components/LoginPage.tsx
src/components/icons.tsx
```

Also check these legacy files — they may still be imported somewhere and cause build errors:
```
src/components/Calendar.tsx
src/components/ChatPanel.tsx
src/components/TodayTasks.tsx
src/components/SettingsModal.tsx
```

---

## What to check and fix

### 1. TypeScript errors
- Run `tsc --noEmit` and fix every error
- Remove all unused imports, variables, and declared-but-never-read constants
- Fix any `any` types where a proper type can be inferred
- Make sure all component props interfaces match their actual usage

### 2. Dead code — legacy files
- `Calendar.tsx`, `ChatPanel.tsx`, `TodayTasks.tsx`, `SettingsModal.tsx` are old components replaced by new ones
- Check if they are still imported anywhere in App.tsx or other files
- If they are imported but not used → remove those imports
- If they are not imported anywhere → delete the files entirely
- Same for any unused imports of `GearIcon`, `SettingsModal`, `Calendar`, `ChatPanel`, `TodayTasks` in App.tsx

### 3. MobileApp.tsx
- Verify `createPortal` import is present from `'react-dom'`
- Verify the tab bar portal renders into `document.body` correctly
- Check that `editTask` state is handled correctly — `isOpen={modalOpen || editTask !== null}` may trigger double-open; simplify to a single `isOpen` boolean
- Verify `groupTasksByDay` is exported from `taskStore.ts` and imported correctly

### 4. CalendarScreen.tsx
- The `Calendar30` grid: verify the 42-cell logic is correct (Monday-start weeks, cells include previous/next month days)
- Verify `dayKey()` format matches the format used in `taskStore.ts` / `supabase.ts` (`yyyy-MM-dd`)
- Check that `navigate()` function correctly shifts by 1 month in 30d mode, by 1 day in 1d/3d mode
- Verify the `title` variable shows correct content for each view mode
- TimeGrid: verify event blocks don't overflow their column, check z-index layering
- Check the `paddingBottom` on the scroll container accounts for the tab bar height

### 5. TasksScreen.tsx
- Verify swipe-to-delete works: `onTouchStart`, `onTouchMove`, `onTouchEnd` all present
- Check that `onEdit` prop is wired correctly and opens AddTaskModal pre-filled
- FAB button: `position: fixed` — verify it doesn't get clipped by a parent with `overflow: hidden`
- Check that `paddingBottom` on the scroll list leaves enough space above the tab bar

### 6. AssistantScreen.tsx
- Verify it uses `sendMessage` from `aiService.ts` (not `window.claude.complete`)
- Check that `addTask` from `useTaskStore` is called when AI parses a task
- Verify speech recognition types are declared (or guarded with `typeof window !== 'undefined'`)
- Check `paddingBottom` on the composer so it's not hidden behind the tab bar

### 7. SettingsScreen.tsx
- Verify `supabase.auth.signOut()` is called on sign-out and redirects to login (sets session to null)
- Verify `theme` and `setTheme` come from `useTaskStore`
- Check that theme changes apply `data-theme` attribute to `document.documentElement`

### 8. taskStore.ts
- Verify `groupTasksByDay` function is exported and correctly converts `Task[]` + `Set<string>` → `Record<string, (Task & { done: boolean })[]>`
- Verify `theme` state exists with `setTheme` action
- Check `donIds` persists correctly across tab switches (it's local-only, not saved to Supabase — that's intentional)

### 9. index.css
- Verify both `[data-theme="light"]` and `[data-theme="dark"]` token sets are defined
- Check that `--ev-0` through `--ev-5` pastel event colors are defined
- Verify `.seg` and `.seg-pill` styles exist for the calendar segment control
- Check there are no references to old class names like `.tabbar`, `.tab`, `.tab-glow` that are now inline in MobileApp — remove them if they exist

### 10. iOS PWA correctness
- Verify `index.html` has `viewport-fit=cover` in the viewport meta tag
- Verify `apple-mobile-web-app-capable` meta is present
- Check that no component uses `100vh` — should use `100%` or `var(--app-h)` instead
- Verify safe-area insets are used correctly: `env(safe-area-inset-top)`, `env(safe-area-inset-bottom, 0px)`

---

## After fixing everything

Run:
```bash
npm run build
```

The build must complete with zero TypeScript errors and zero warnings about unused variables. Report what you fixed.
