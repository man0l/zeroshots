/**
 * OAuth callback relay for the Screenshot Organizer mobile app.
 *
 * GoTrue v2.2.12 uses EXACT string matching for redirect URL validation and
 * rejects non-HTTP schemes. This relay receives the HTTPS redirect with tokens
 * in the URL fragment, then client-side JavaScript reads the fragment and
 * redirects to the app's deep link.
 *
 * The app's deep link URL is passed via the `redirect` query parameter which
 * is preserved through the GoTrue redirect (fragments are appended AFTER the
 * full URL including query string).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const APP_REDIRECT = 'screenshot-organizer://auth/callback';

Deno.serve((_req: Request) => {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Signing in...</title>
  <style>
    body {
      background: #0f172a; color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex; align-items: center; justify-content: center;
      height: 100vh; margin: 0;
    }
    .container { text-align: center; }
    .spinner {
      width: 40px; height: 40px; margin: 0 auto 16px;
      border: 3px solid #1e293b; border-top-color: #38bdf8;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>Redirecting to app...</p>
  </div>
  <script>
    (function() {
      var hash = window.location.hash;
      var redirect = '${APP_REDIRECT}';

      if (hash) {
        var tokenParams = hash.substring(1);
        window.location.href = redirect + '?' + tokenParams;
      } else {
        document.querySelector('p').textContent = 'Authentication failed. Please try again.';
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});
