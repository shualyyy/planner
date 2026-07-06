// ── Theme presets ───────────────────────────────────────────────────────────
// Each preset overrides CSS accent variables on :root.
// Base (dark/light) is controlled separately by the existing toggle,
// unless the preset has a `forceBase` — then switching preset also sets base.

export interface ThemePreset {
  id: string
  label: string
  emoji: string
  /** Main accent swatch shown in the picker */
  swatch: string
  forceBase?: 'dark' | 'light'
  vars: {
    '--accent': string
    '--accent-soft': string
    '--accent-2': string
    '--accent-glow': string
    '--accent-ink': string
    '--brand': string
    '--brand-deep': string
  }
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'terra',
    label: 'Terra',
    emoji: '🏺',
    swatch: '#CC785C',
    vars: {
      '--accent':      '#CC785C',
      '--accent-soft': 'rgba(204,120,92,0.15)',
      '--accent-2':    'rgba(204,120,92,0.35)',
      '--accent-glow': 'rgba(204,120,92,0.30)',
      '--accent-ink':  '#fff',
      '--brand':       '#CC785C',
      '--brand-deep':  '#A85840',
    },
  },
  {
    id: 'mono',
    label: 'Mono',
    emoji: '⬛',
    swatch: '#FAFAF7',
    forceBase: 'dark',
    vars: {
      '--accent':      '#FAFAF7',
      '--accent-soft': 'rgba(250,250,247,0.08)',
      '--accent-2':    'rgba(250,250,247,0.20)',
      '--accent-glow': 'rgba(250,250,247,0.10)',
      '--accent-ink':  '#191919',
      '--brand':       '#FAFAF7',
      '--brand-deep':  '#D0D0CB',
    },
  },
  {
    id: 'solar',
    label: 'Solar',
    emoji: '☀️',
    swatch: '#D4A017',
    forceBase: 'light',
    vars: {
      '--accent':      '#C49010',
      '--accent-soft': 'rgba(212,160,23,0.13)',
      '--accent-2':    'rgba(212,160,23,0.28)',
      '--accent-glow': 'rgba(212,160,23,0.20)',
      '--accent-ink':  '#fff',
      '--brand':       '#C49010',
      '--brand-deep':  '#9E7208',
    },
  },
]

export const DEFAULT_PRESET_ID = 'terra'

export function applyThemePreset(preset: ThemePreset): void {
  const root = document.documentElement
  Object.entries(preset.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

export function getPresetById(id: string): ThemePreset {
  return THEME_PRESETS.find(p => p.id === id) ?? THEME_PRESETS[0]
}
