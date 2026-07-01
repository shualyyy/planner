# Claude Code — финальные доработки Planer

## Стек
React 18 + TypeScript + Vite PWA, Supabase, Zustand (`useTaskStore`), iOS-first дизайн.
CSS-переменные: `--accent #CC785C`, `--bg #191919`, `--surface #262625`, `--surface2 #40403E`, `--text #FAFAF7`, `--text-muted #BFBFBA`.

---

## 1. Push-уведомления в Settings

**Файл:** `src/components/SettingsScreen.tsx`

Добавь тоггл для подписки на push-уведомления. Хук уже готов: `src/hooks/usePushNotifications.ts`.

**Что нужно:**
1. Импортируй хук вверху файла:
```typescript
import { usePushNotifications } from '../hooks/usePushNotifications'
```

2. Внутри компонента `SettingsScreen` подключи хук:
```typescript
const { subscribed, supported, loading, subscribe, unsubscribe } = usePushNotifications()
```

3. Добавь строку в секцию **Appearance** (после тоггла темы), только если `supported === true`:
```tsx
{supported && (
  <button
    className="settings-row"
    onClick={() => subscribed ? unsubscribe() : subscribe()}
    style={{ width: '100%', textAlign: 'left', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
  >
    <div className="set-icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    </div>
    <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>Notifications</span>
    {/* iOS-style toggle */}
    <div style={{
      width: 44, height: 26, borderRadius: 13,
      background: subscribed ? 'var(--accent)' : 'var(--surface3)',
      position: 'relative', transition: 'background 0.2s',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: subscribed ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  </button>
)}
```

---

## 2. Исправить avatar_color в SettingsScreen

**Файл:** `src/components/SettingsScreen.tsx`

В `AVATAR_COLORS` замени старые цвета на Anthropic-палитру:
```typescript
const AVATAR_COLORS = [
  '#CC785C', '#61AAF2', '#3DD68C', '#A78BFA',
  '#F5BDD0', '#D4A27F', '#CC5247', '#8ED4C8',
]
```

В `EditProfileSheet` исправь дефолтный цвет с `'#D97757'` на `'#CC785C'` во всех местах где он встречается (useState, save function и т.д.).

---

## 3. theme_color в vite.config.ts уже исправлен (#191919).

---

## 4. Исправить supabase-coop-setup.sql

**Файл:** `supabase-coop-setup.sql`

В строке `avatar_color TEXT NOT NULL DEFAULT '#D97757'` замени `'#D97757'` на `'#CC785C'`.

---

## 5. Проверить TypeScript

После всех изменений запусти:
```bash
npx tsc --noEmit
```

Исправь все ошибки типов если есть.

---

## 6. Git commit

```bash
git add -A
git commit -m "feat: push notification toggle in Settings, Anthropic color fixes"
git push origin main
```

---

## Итог что уже работает (не трогай):
- ✅ Anthropic палитра в `src/index.css` (тёмная + светлая тема)
- ✅ Members bottom sheet в ProjectsScreen
- ✅ Assignee selector в AddTaskModal
- ✅ Chrono-node парсинг дат в AddTaskModal
- ✅ Habit streaks в HabitsSheet и TasksScreen
- ✅ Search в TasksScreen
- ✅ Profile edit (display_name + avatar color) в SettingsScreen
- ✅ Pending invites в SettingsScreen
- ✅ Theme toggle в SettingsScreen
- ✅ OnboardingScreen, PaywallSheet, StatsScreen, TaskDetailSheet
- ✅ SQL миграции 001–006 в supabase/migrations/
- ✅ Edge Function send-push задеплоена
- ✅ usePushNotifications hook в src/hooks/
- ✅ Service worker с push handler (src/sw.ts)
- ✅ GitHub Actions workflow (.github/workflows/deploy.yml)
- ✅ Privacy policy (public/privacy.html)
