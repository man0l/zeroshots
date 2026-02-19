# Agent Instructions for Screenshot Organizer

## Role
You are an AI software engineer working on the Screenshot Organizer app. Your goal is to build, test, and ship high-quality code.

## Context
- **Project**: Screenshot Organizer - A mobile app for cleaning up screenshots
- **Tech Stack**: Expo (React Native), TypeScript, Supabase (Self-Hosted), RevenueCat
- **Infrastructure**: Docker Compose for local development
- **Reference**: Read `prd/PRD.md` for complete specifications

## Work Process

### 1. Planning
Before coding, read the PRD and identify:
- Which screen/component needs work
- Design tokens (colors, fonts, spacing from PRD Section 1)
- Required UI components
- State management needs
- Database schema requirements

### 2. Infrastructure Setup
Always ensure the backend is running before working on features:

```bash
# Start Supabase (Docker Compose)
cd supabase
cp .env.example .env
# Edit .env with your values
docker compose up -d

# Check services are healthy
docker compose ps

# View logs if needed
docker compose logs -f [service-name]
```

**Access Points:**
- Supabase Studio (DB UI): http://localhost:8000
- API Endpoint: http://localhost:8000
- PostgreSQL: localhost:5432

### 3. Database Changes
When modifying schema:
1. Create migration in `supabase/migrations/`
2. Name format: `00N_description.sql`
3. Apply migration: `docker exec supabase-db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/migrations-custom/00N_description.sql`
4. Test with existing data

### 4. Implementation
- Follow the architecture in PRD Section 2
- Use design tokens from `src/lib/theme.ts`
- Keep components modular and reusable
- Add TypeScript types for all props and state
- Use Zustand for state management
- Implement haptic feedback for actions
- Update Supabase client in `src/lib/supabase/client.ts` if needed

### 5. Testing
After implementation:
- Run `npx tsc --noEmit` to check for type errors
- Run Playwright tests: `cd web-demo && npx playwright test`
- Test against local Supabase (not cloud)
- Fix any failing tests before marking complete

### 6. Progress Tracking
Update the execution plan checklist in PRD:
- Mark tasks as completed
- Add notes for partially completed items
- Create follow-up tasks as needed

## Docker Commands Reference

```bash
# Start all services
cd supabase && docker compose up -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f db
docker compose logs -f auth

# Stop services
docker compose down

# Reset database (WARNING: destroys all data)
docker compose down -v
docker compose up -d

# Backup database
docker exec supabase-db pg_dump -U postgres postgres > backup.sql

# Restore database
docker exec -i supabase-db psql -U postgres postgres < backup.sql

# Restart specific service
docker compose restart [service-name]

# Check service health
docker compose ps
```

## Environment Variables

### Backend (`supabase/.env`)
- `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `ANON_KEY` - Anonymous access key
- `SERVICE_ROLE_KEY` - Service role key (admin access)
- `SITE_URL` - Your app URL (http://localhost:8081)

### Mobile App (`screenshot-organizer/.env`)
- `EXPO_PUBLIC_SUPABASE_URL=http://localhost:8000`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`
- `EXPO_PUBLIC_REVENUECAT_API_KEY=your-revenuecat-key`

## Design System Reference

### Colors
- Primary: `#38BDF8` (Sky Blue)
- Background: `#0F172A` (Deep Navy)
- Surface: `#1E293B` (Slate-800)
- Delete: `#EF4444` (Red)
- Keep: `#10B981` (Green)
- Archive: `#8B5CF6` (Purple)
- Text Primary: `#F1F5F9`
- Text Muted: `#94A3B8`

### Effects
- Glass morphism: `bg-white/5 backdrop-blur-xl border-white/10`
- Neon glow: `shadow-[0_0_15px_rgba(color,0.6)]`
- Tech shadow: `shadow-[0_10px_0_0_#CBD5E1]`

### Fonts
- Display: Space Grotesk (headings)
- Body: Inter (UI text)
- Mono: JetBrains Mono (stats)

## Key Files
- `prd/PRD.md` - Full specifications
- `supabase/docker-compose.yml` - Infrastructure config
- `supabase/migrations/` - Database schema
- `src/lib/theme.ts` - Design tokens
- `src/lib/supabase/client.ts` - Database client
- `web-demo/tests/app.spec.ts` - Playwright tests
- `app/(tabs)/` - Screen implementations
- `src/components/` - Reusable components
- `src/state/` - Zustand stores

## Testing with Playwright
The web-demo includes Playwright tests that validate:
- UI components render correctly
- Actions (delete/keep/archive) work
- Trust counter updates properly
- Screenshots cycle through queue
- Trust limit is enforced

Run tests with: `cd web-demo && npx playwright test --reporter=list`

## Current Status
See PRD Section 6 (Execution Plan) for progress:
- [x] Phase 1: Foundation (Docker setup included)
- [x] Phase 2: The Stack
- [x] Phase 3: The Vault
- [x] Phase 4: Session Recap
- [x] Phase 5: Monetization
- [x] Phase 6: Polish (partial)

## Next Steps
1. Start Docker Compose stack
2. Verify database migrations applied
3. Implement auth screens (sign-in.tsx, onboarding.tsx)
4. Implement Supabase edge functions
5. Add error boundaries and loading states
6. Integrate real RevenueCat SDK

## Troubleshooting

### Docker Issues
- **Port conflicts**: Make sure ports 8000, 5432, 9999 are free
- **Memory issues**: Increase Docker memory limit to 4GB+
- **Volume permissions**: Run `sudo chown -R $USER:$USER supabase/volumes/`

### Database Connection
- Check `docker compose ps` to ensure db is healthy
- Verify `.env` values match between backend and frontend
- Test connection: `docker exec -it supabase-db psql -U postgres`

### Node.js Version
Expo requires Node.js 20+. If you have an older version:
- Use `nvm` to switch versions
- Or develop against the web demo only

## Commands
```bash
# Type check
npx tsc --noEmit

# Run tests
cd web-demo && npx playwright test

# Start backend
cd supabase && docker compose up -d

# Start dev server (requires Node 20+)
cd screenshot-organizer && npm start
```
