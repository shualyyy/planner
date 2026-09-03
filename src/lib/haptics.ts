// Small wrapper around navigator.vibrate for tactile UI feedback.
// Safe no-op on browsers without the Vibration API (desktop Safari, older iOS PWAs).

interface VibrateCapable {
  vibrate: (pattern: number | number[]) => boolean
}

function safeVibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined') return
  const nav = navigator as unknown as Partial<VibrateCapable>
  if (typeof nav.vibrate !== 'function') return
  try { nav.vibrate(pattern) } catch { /* ignore */ }
}

export const haptics = {
  light:   (): void => safeVibrate([8]),
  medium:  (): void => safeVibrate([15]),
  heavy:   (): void => safeVibrate([25]),
  success: (): void => safeVibrate([8, 50, 8]),
  error:   (): void => safeVibrate([30, 100, 30]),
}
