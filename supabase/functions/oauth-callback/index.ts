/**
 * OAuth callback proxy for mobile apps.
 * GoTrue redirects here with ?code=... (PKCE). We redirect to the app with the code in the path
 * so the app receives it even when the OS strips query params from custom scheme URLs (e.g. Android).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const APP_SCHEME = 'screenshot-organizer'

const ALLOWED_REDIRECT_PATTERNS = [
  /^screenshot-organizer:\/\//,
  /^exp:\/\/[^/]*\/?--\//,
  /^exp:\/\/localhost/,
  /^exp:\/\/\d{1,3}(\.\d{1,3}){3}/,
  /^http:\/\/localhost(:\d+)?/,
  /^http:\/\/10\.0\.2\.2(:\d+)?/,
]

function isAllowedRedirect(uri: string): boolean {
  return ALLOWED_REDIRECT_PATTERNS.some((pattern) => pattern.test(uri))
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(unescape(encodeURIComponent(str)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const appRedirect = url.searchParams.get('app_redirect')
  const error = url.searchParams.get('error_description') ?? url.searchParams.get('error')
  const appRedirectBase =
    appRedirect && /^(https?|exp):\/\//i.test(appRedirect)
      ? appRedirect.replace(/\/?$/, '')
      : null

  if (error) {
    const base = appRedirectBase ?? (state && /^(https?|exp):\/\//i.test(state) ? state.replace(/\/?$/, '') : `${APP_SCHEME}://auth/callback`)
    const redirect = `${base}?error=${encodeURIComponent(error)}`
    return Response.redirect(redirect, 302)
  }

  if (!code) {
    return new Response('Missing code parameter', { status: 400 })
  }

  if (state && !stateIsValid) {
    return new Response('Invalid redirect URI in state parameter', { status: 400 })
  }

  const encoded = base64UrlEncode(code)
  // If state is the app's redirect base (e.g. exp://... for Expo Go), redirect there so the app receives the code
  const redirect =
    appRedirectBase
      ? `${appRedirectBase}/${encoded}`
      : state && /^(https?|exp):\/\//i.test(state)
      ? `${state.replace(/\/?$/, '')}/${encoded}`
      : `${APP_SCHEME}://auth/callback/${encoded}`
  return Response.redirect(redirect, 302)
})
