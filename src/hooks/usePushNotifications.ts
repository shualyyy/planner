import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [subscribed, setSubscribed] = useState(false)
  const [supported, setSupported] = useState(false)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(ok)
    if (ok) checkSubscription()
  }, [])

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch { /* ignore */ }
  }

  async function subscribe() {
    if (!supported || !VAPID_PUBLIC_KEY) return
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('push_subscriptions').upsert({
        user_id:  user.id,
        endpoint: json.endpoint,
        p256dh:   json.keys.p256dh,
        auth:     json.keys.auth,
      }, { onConflict: 'user_id,endpoint' })

      setSubscribed(true)
    } catch (err) {
      console.error('[Push] subscribe error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', endpoint)
        }
      }
      setSubscribed(false)
    } catch (err) {
      console.error('[Push] unsubscribe error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { subscribed, supported, loading, subscribe, unsubscribe }
}
