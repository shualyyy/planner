/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any[] }

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return
  let data: { title?: string; body?: string; url?: string } = {}
  try { data = event.data.json() } catch { data = { title: event.data.text() } }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Planer', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url ?? '/' },
      // vibrate is non-standard in TS types but supported at runtime on Android
      ...({ vibrate: [100, 50, 100] } as Record<string, unknown>),
    })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data?.url as string) ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
