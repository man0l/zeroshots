/**
 * OAuth callback proxy for mobile apps.
 * GoTrue redirects here with ?code=... (PKCE). We redirect to the app with the code in the path
 * so the app receives it even when the OS strips query params from custom scheme URLs (e.g. Android).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const APP_SCHEME = 'screenshot-organizer'

function base64UrlEncode(str: string): string {
  const base64 = btoa(unescape(encodeURIComponent(str)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error_description') ?? url.searchParams.get('error')

  if (error) {
    const base = state && /^(https?|exp):\/\//i.test(state) ? state.replace(/\/?$/, '') : `${APP_SCHEME}://auth/callback`
    const redirect = `${base}?error=${encodeURIComponent(error)}`
    return Response.redirect(redirect, 302)
  }

  if (!code) {
    return new Response('Missing code parameter', { status: 400 })
  }

  const encoded = base64UrlEncode(code)
  // If state is the app's redirect base (e.g. exp://... for Expo Go), redirect there so the app receives the code
  const redirect =
    state && /^(https?|exp):\/\//i.test(state)
      ? `${state.replace(/\/?$/, '')}/${encoded}`
      : `${APP_SCHEME}://auth/callback/${encoded}`
  return Response.redirect(redirect, 302)
})
