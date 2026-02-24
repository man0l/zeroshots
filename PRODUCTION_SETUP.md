# Production Setup (Contabo / api.zenmanager.eu)

One-time steps to connect this app to the shared Supabase production instance.

## 1. Grant GHCR package write access

The CI needs to push to `ghcr.io/man0l/cold-email-ninja-app:functions-latest`.
The package belongs to the `zero-gtm` repo origin, so you must explicitly grant
the `zeroshots` repo write access:

1. Go to https://github.com/users/man0l/packages/container/cold-email-ninja-app/settings
2. Under **"Manage Actions access"** → click **"Add Repository"**
3. Select **`man0l/zeroshots`** → set role to **Write**

After this, the `GITHUB_TOKEN` in the CI workflow can push to that package.

## 2. Add GitHub secret: SUPABASE_DB_URL

The CI migration job needs direct database access to run `supabase db push`.

In the `zeroshots` repo settings → Secrets and variables → Actions:

```
SUPABASE_DB_URL=postgresql://postgres:<POSTGRES_PASSWORD>@<contabo-server-ip>:54322/salonease
```

Port `54322` is how `supabase-db17` is exposed on the host (see `docker-compose.prod.yml`).

## 3. Update supabase/.env on Contabo

SSH into the Contabo server and edit the Supabase `.env`:

```env
# Add screenshot_organizer to PostgREST exposed schemas
PGRST_DB_SCHEMAS=public,screenshot_organizer

# Add Gemini API key (used by so-classify-image function)
GEMINI_API_KEY=<your-gemini-api-key>

# Append to existing ADDITIONAL_REDIRECT_URLS (comma-separated, no spaces):
# screenshot-organizer://**,https://api.zenmanager.eu/functions/v1/so-oauth-callback
ADDITIONAL_REDIRECT_URLS=<existing-values>,screenshot-organizer://**,https://api.zenmanager.eu/functions/v1/so-oauth-callback
```

## 4. Update docker-compose.prod.yml on Contabo

Add `GEMINI_API_KEY` to the `supabase-functions` service environment:

```yaml
supabase-functions:
    # image tag stays: ghcr.io/man0l/cold-email-ninja-app:functions-latest (no change)
    environment:
      - SUPABASE_URL=http://supabase-kong:8000
      - SUPABASE_ANON_KEY=${ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
      - SUPABASE_DB_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      - JWT_SECRET=${JWT_SECRET}
      - VERIFY_JWT=false
      - GEMINI_API_KEY=${GEMINI_API_KEY}    # add this line
```

## 5. Restart affected services

```bash
cd /path/to/docker-compose.prod.yml

# Restart PostgREST to pick up PGRST_DB_SCHEMAS change
docker compose restart supabase-rest

# Restart GoTrue to pick up ADDITIONAL_REDIRECT_URLS change
docker compose restart supabase-auth

# Restart functions to pick up GEMINI_API_KEY
docker compose restart supabase-functions
```

## 6. Add Google OAuth redirect URI

In **Google Cloud Console** → APIs & Services → Credentials →
your OAuth 2.0 Client ID (Web application) → Authorized redirect URIs, add:

```
https://api.zenmanager.eu/auth/v1/callback
```

## 7. Run the migration on supabase-db17

The CI `migrations` job uses `supabase db push --db-url` which is idempotent --
it only applies migrations not yet tracked in `supabase_migrations.schema_migrations`.

For the initial one-time run, trigger the workflow manually:
`Actions → Deploy Functions → Run workflow`

Or apply directly:

```bash
# Using Supabase CLI (preferred — tracks which migrations have been applied)
supabase db push --db-url "postgresql://postgres:<POSTGRES_PASSWORD>@<contabo-ip>:54322/salonease"

# Or via docker exec (manual fallback)
cat supabase/migrations/20260224000000_screenshot_organizer_schema.sql | \
  docker exec -i supabase-db17 psql -U postgres -d postgres
```

## 8. Verify production

```bash
ANON_KEY="<your-production-anon-key>"

# PostgREST schema accessible
curl -s \
  -H "Accept-Profile: screenshot_organizer" \
  -H "apikey: $ANON_KEY" \
  "https://api.zenmanager.eu/rest/v1/users" | head -c 100

# Edge function reachable (expect 401, not 404)
curl -s -o /dev/null -w "%{http_code}" \
  "https://api.zenmanager.eu/functions/v1/so-classify-image"
```

## App environment for production builds

Set these in `screenshot-organizer/.env` (gitignored) before building:

```env
EXPO_PUBLIC_SUPABASE_URL=https://api.zenmanager.eu
EXPO_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
EXPO_PUBLIC_REVENUECAT_API_KEY=<your-revenuecat-key>
EXPO_PUBLIC_EDGE_FUNCTION_PREFIX=so-
```
