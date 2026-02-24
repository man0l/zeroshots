# Local-Only Migrations

SQL files here set up the **local development database only**.
They create `public` schema tables that the app used before the
`screenshot_organizer` schema was introduced.

**These files are NEVER applied to production** — they are only picked up by
the local `supabase-db` Docker container via the volume mount:
  `./local-migrations:/docker-entrypoint-initdb.d/migrations-local`

PostgreSQL runs them automatically on first container init (empty data volume).

See `../migrations/` for production migrations that also run locally.
