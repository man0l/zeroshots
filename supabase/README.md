# Screenshot Organizer - Docker Setup

This directory contains the Docker Compose configuration for self-hosted Supabase backend.

## Quick Start

### 1. Configure Environment

```bash
cd supabase
cp .env.example .env

# Generate secure keys (optional)
bash generate-keys.sh

# Edit .env with your preferred values
nano .env
```

### 2. Start Services

```bash
docker compose up -d

# Wait for services to be healthy (30-60 seconds)
docker compose ps
```

### 3. Access Services

| Service | URL | Description |
|---------|-----|-------------|
| Supabase Studio | http://localhost:8001 | Database UI |
| API Endpoint (Kong) | http://localhost:8080 | REST API, Auth, Functions |
| PostgreSQL | localhost:5432 | Direct DB access |

### 4. Run Migrations

```bash
# Apply initial schema
docker exec supabase-db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/migrations-custom/001_initial_schema.sql
```

### 5. Configure Mobile App

Update `screenshot-organizer/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=http://localhost:8080
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-env
```
(Use 8080 — Kong is on host port 8080 in this compose.)

### 6. Google sign-in (optional)

To use "Sign in with Google" in the app:

1. In `supabase/.env`: set `ENABLE_GOOGLE_AUTH=true`, and set `ADDITIONAL_REDIRECT_URLS` (see `.env.example`).
2. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Create an OAuth 2.0 Client ID of type **Web application** (so you can set redirect URIs).
   - Under **Authorized redirect URIs**, add this **exact** URI (fixes "Error 400: redirect_uri_mismatch"):
     - `http://localhost:8080/auth/v1/callback`
   - (Port 8080 = Kong in this compose. If your `API_EXTERNAL_URL` is different, use that base + `/auth/v1/callback`.)
   - Save.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `supabase/.env` from that client.
4. Restart Auth: `docker compose restart auth`.

**If you see "Error 400: redirect_uri_mismatch":** GoTrue sends to Google the URI `API_EXTERNAL_URL` + `/auth/v1/callback`. In this compose, Kong is on port 8080, so `API_EXTERNAL_URL` is `http://localhost:8080` and you must add `http://localhost:8080/auth/v1/callback` in Google Console (no trailing slash). Save and wait a few minutes.

**Android / emulator:** For Google sign-in on the Android emulator (adb reverse, `API_EXTERNAL_URL`, app `.env`), see the app’s **[ANDROID_OAUTH.md](../screenshot-organizer/ANDROID_OAUTH.md)**.

**Production (Traefik / same-host callback):** If you put Supabase behind Traefik with a public domain (e.g. `api.yourdomain.com`), use an **auth-relay** style route so the OAuth callback is on the same host as your API (GoTrue and Google are happy with one redirect URI). Example (from [salonease](https://github.com/man0l/salonease/blob/master/docker-compose.prod.yml)): expose the callback at `https://yourdomain.com/auth-relay` and rewrite to `/functions/v1/oauth-callback`; then in the app set `redirectTo` to `https://yourdomain.com/auth-relay` and add that URL to `ADDITIONAL_REDIRECT_URLS` and to Google’s Authorized redirect URIs (as the GoTrue callback will be that host + path).

## Services Overview

- **PostgreSQL** - Primary database
- **Supabase Auth (GoTrue)** - Authentication
- **Supabase Storage** - File storage
- **Supabase Edge Functions** - Serverless functions
- **Kong** - API Gateway
- **Redis** - Rate limiting & caching
- **Supabase Studio** - Database UI

## Default Credentials

- **Studio Username**: `supabase` (set in .env)
- **Studio Password**: `this_is_not_a_secure_password` (set in .env)
- **Database**: `postgres` / password from .env

## Common Commands

```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f db
docker compose logs -f auth

# Stop all services
docker compose down

# Reset everything (DESTROYS DATA)
docker compose down -v
docker compose up -d

# Backup database
docker exec supabase-db pg_dump -U postgres postgres > backup.sql

# Restore database
docker exec -i supabase-db psql -U postgres postgres < backup.sql

# Check health
docker compose ps
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 8000
lsof -i :8000

# Kill process or change port in .env
```

### Permission Denied
```bash
# Fix volume permissions
sudo chown -R $USER:$USER volumes/
```

### Services Won't Start
```bash
# Check logs for errors
docker compose logs

# Restart specific service
docker compose restart db
```

## Database Migrations

Place migration files in `migrations/` directory:
- Format: `00N_description.sql`
- Applied automatically on container start
- Can also apply manually: `docker exec supabase-db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/migrations-custom/00N_description.sql`

## Edge Functions

Place function code in `functions/` directory:
```
functions/
├── entitlement-sync/
│   └── index.ts
├── usage-enforce/
│   └── index.ts
└── event-ingest/
    └── index.ts
```

Access at: `http://localhost:8000/functions/v1/[function-name]`
