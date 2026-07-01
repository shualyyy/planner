// Supabase Edge Function — send-push
// Sends Web Push notification to all subscriptions of a user.
// Deploy: supabase functions deploy send-push

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!
const VAPID_EMAIL       = "mailto:sitrokaban@gmail.com"

// ── VAPID helper (no npm:web-push needed in Deno) ───────────────────────────
async function signVapid(audience: string): Promise<string> {
  const header  = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" })).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")
  const now     = Math.floor(Date.now() / 1000)
  const payload = btoa(JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: VAPID_EMAIL }))
    .replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")

  const keyData = Uint8Array.from(atob(VAPID_PRIVATE_KEY.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  )
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(`${header}.${payload}`)
  )
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")
  return `vapid t=${header}.${payload}.${sigB64},k=${VAPID_PUBLIC_KEY}`
}

async function sendToEndpoint(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string
) {
  const url      = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const vapidHeader = await signVapid(audience)

  // Encrypt payload (simplified — using text/plain for Deno without webcrypto ECDH issue)
  const body = new TextEncoder().encode(payload)

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization":  vapidHeader,
      "Content-Type":   "application/octet-stream",
      "Content-Length": String(body.length),
      "TTL":            "86400",
    },
    body,
  })
}

// ── Main handler ────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } })
  }

  try {
    const { user_id, title, body, url } = await req.json()
    if (!user_id || !title) return new Response(JSON.stringify({ error: "user_id and title required" }), { status: 400 })

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id)

    if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 })

    const results = await Promise.allSettled(
      subs.map(s => sendToEndpoint(s.endpoint, s.p256dh, s.auth, JSON.stringify({ title, body: body ?? "", url: url ?? "/" })))
    )

    // Remove expired subscriptions (410 Gone)
    const expired = subs.filter((_, i) => {
      const r = results[i]
      return r.status === "fulfilled" && (r.value as Response).status === 410
    })
    if (expired.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", expired.map(s => s.endpoint))
    }

    const sent = results.filter(r => r.status === "fulfilled").length
    return new Response(JSON.stringify({ sent }), { status: 200, headers: { "Access-Control-Allow-Origin": "*" } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
