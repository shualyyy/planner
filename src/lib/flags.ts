// ── Feature flags ──────────────────────────────────────────────────────────
//
// BETA_OPEN_PRO — временно открывает Pro-функции всем пользователям.
// Чтобы вернуть платный доступ, поменяй на false и задеплой.
//
export const BETA_OPEN_PRO = true // TODO: set false before monetization launch

export function getEffectivePlan(
  profile: { plan?: string | null } | null | undefined
): 'free' | 'pro' {
  if (BETA_OPEN_PRO) return 'pro'
  return (profile?.plan ?? 'free') as 'free' | 'pro'
}
