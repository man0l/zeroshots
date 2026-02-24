# Production Migrations

SQL files here are applied by CI (`deploy-functions.yml`) to the production
`supabase-db17` database on Contabo via `supabase db push --db-url`.

**Rules:**
- File names must use timestamp format: `YYYYMMDDHHMMSS_description.sql`
  (required by `supabase db push` for tracking in `supabase_migrations.schema_migrations`)
- Never put `public` schema objects here — production is a shared DB; each app owns its own schema
- The Supabase CLI only applies migrations not yet tracked, so re-runs are safe

**Local dev:** These migrations also run automatically at first init via the Docker
volume mount (`./migrations:/docker-entrypoint-initdb.d/migrations-custom`).

See `../local-migrations/` for local-only setup migrations.
