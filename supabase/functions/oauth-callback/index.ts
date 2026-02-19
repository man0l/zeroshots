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
  const error = url.searchParams.get('error_description') ?? url.searchParams.get('error')

  if (error) {
    const redirect = `${APP_SCHEME}://auth/callback?error=${encodeURIComponent(error)}`
    return Response.redirect(redirect, 302)
  }

  if (!code) {
    return new Response('Missing code parameter', { status: 400 })
  }

  const encoded = base64UrlEncode(code)
  const redirect = `${APP_SCHEME}://auth/callback/${encoded}`
  return Response.redirect(redirect, 302)
})
