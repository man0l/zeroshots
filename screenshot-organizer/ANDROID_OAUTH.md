# Android Google Sign-In (Self-Hosted Supabase)

Use this checklist when Google sign-in fails on Android or the emulator.

## Error 400: redirect_uri_mismatch (fix first)

Google shows this when the redirect URI sent by the app doesn’t match Google Cloud Console.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Open your **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized redirect URIs** click **ADD URI** and add **exactly** (copy-paste, no trailing slash):
   ```text
   http://localhost:8080/auth/v1/callback
   ```
4. Click **Save**. Wait 1–2 minutes, then try sign-in again.

With default **supabase/.env** (`API_EXTERNAL_URL=http://localhost:8080`), the above is the only URI GoTrue sends to Google. If you later set `API_EXTERNAL_URL=http://10.0.2.2:8080` for the emulator, also add:
   ```text
   http://10.0.2.2:8080/auth/v1/callback
   ```

---

## 1. App environment

In **screenshot-organizer/.env**:

```bash
# Kong is on host port 8080 (see supabase/docker-compose.yml)
EXPO_PUBLIC_SUPABASE_URL=http://localhost:8080
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

On the **Android emulator**, the app rewrites `localhost` → `10.0.2.2` automatically, so it will call `http://10.0.2.2:8080`. No need to set `10.0.2.2` in `.env` unless you want the footer to show it.

## "Sign in was cancelled or failed" on the emulator

If Google no longer shows **redirect_uri_mismatch** but the app shows this message after you sign in with Google, the emulator's browser is sent to `http://localhost:8080/auth/v1/callback` and cannot reach your PC (on the emulator, localhost is the emulator itself). Run once, then try again:

```bash
adb reverse tcp:8080 tcp:8080
```

## 2. Emulator reaching the host

When the in-app browser returns from Google, it is sent to `http://localhost:8080/auth/v1/callback`. On the emulator, “localhost” is the **emulator**, not your PC, so that request can fail unless you do one of the following.

### Option A: adb reverse (recommended)

Before opening the app on the emulator, run once:

```bash
adb reverse tcp:8080 tcp:8080
```

Then the emulator’s `localhost:8080` is forwarded to your host’s port 8080 (Kong). Keep **supabase/.env** as:

```bash
API_EXTERNAL_URL=http://localhost:8080
```

### Option B: Use 10.0.2.2 in Supabase

If you prefer not to use adb reverse, point GoTrue at the host IP the emulator can reach:

In **supabase/.env**:

```bash
# Emulator can reach host at 10.0.2.2
API_EXTERNAL_URL=http://10.0.2.2:8080
```

And in Google Console add:

- `http://10.0.2.2:8080/auth/v1/callback`

Restart auth after changing `.env`:

```bash
cd supabase && docker compose restart auth
```

## 3. Supabase redirect allow list

**supabase/.env** should already include:

```bash
ADDITIONAL_REDIRECT_URLS=screenshot-organizer://**,http://localhost:8081/**,http://localhost:8080/functions/v1/oauth-callback,http://10.0.2.2:8080/functions/v1/oauth-callback
```

This allows the OAuth callback proxy and the app’s redirect targets.

## 4. After changing config

- **supabase/.env** (auth / redirect URLs):  
  `docker compose restart auth`
- **Kong** (e.g. kong.yml):  
  `docker compose restart kong functions`

## Quick checklist

- [ ] **screenshot-organizer/.env**: `EXPO_PUBLIC_SUPABASE_URL=http://localhost:8080`
- [ ] **Google Console**: Added `http://localhost:8080/auth/v1/callback` (and `http://10.0.2.2:8080/auth/v1/callback` if using Option B)
- [ ] **Emulator**: run `adb reverse tcp:8080 tcp:8080` (Option A) or set `API_EXTERNAL_URL=http://10.0.2.2:8080` (Option B)
- [ ] Restart **auth** (and **kong** / **functions** if you changed them)
