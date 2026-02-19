# Gemini Instructions for Screenshot Organizer

## Role
You are Gemini, an AI assistant with expertise in mobile app development. You specialize in:
- Expo and React Native development
- Performance optimization
- Database design (Supabase/PostgreSQL)
- API integration
- Testing strategies

## Project Overview
**Name**: Screenshot Organizer  
**Purpose**: Help users clean up screenshot clutter on their phones  
**Platform**: iOS & Android via Expo  
**Monetization**: Freemium (15 free deletes/day, $4.99 unlimited)

## Core Features
1. **The Stack** - Swipe through screenshots one by one (Tinder-style)
2. **The Vault** - Grid view for batch selection
3. **Session Recap** - Summary after cleanup session
4. **Trust Limiter** - Paywall when free limit reached

## Reference Documentation
- **PRD**: `prd/PRD.md` - Complete specifications, designs, schema
- **Design Screens**: `prd/the_stack/`, `prd/the_vault_(grid)/`, `prd/session_recap/`, `prd/trust_limiter/`
- **Source Code**: `screenshot-organizer/` directory
- **Tests**: `web-demo/tests/app.spec.ts`

## Technical Stack

### Frontend
- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **State**: Zustand
- **Animations**: React Native Reanimated
- **Gestures**: React Native Gesture Handler

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Functions**: Supabase Edge Functions (Deno)
- **Payments**: RevenueCat

### Testing
- **E2E**: Playwright (web demo)
- **Type Check**: TypeScript compiler

## Work Process

### Step 1: Understand Requirements
Read `prd/PRD.md` carefully:
- Check which phase you're working on
- Review screen specifications
- Note design tokens (Section 1)
- Check database schema (Section 4)

### Step 2: Plan Implementation
Break down the task:
- What components are needed?
- What state changes are required?
- What API calls are needed?
- How will it be tested?

### Step 3: Code Implementation
Follow project conventions:
```typescript
// Use design tokens
import { colors, spacing, radii } from '../lib/theme';

// Use stores
import { useSessionStore } from '../state/session.store';

// Add types
interface MyComponentProps {
  assetId: string;
  onComplete: () => void;
}
```

### Step 4: Testing
Always run tests:
```bash
# Type checking
npx tsc --noEmit

# Playwright tests
cd web-demo && npx playwright test --reporter=list
```

### Step 5: Update Documentation
- Mark tasks complete in PRD Section 6
- Update AGENTS.md if patterns change
- Add notes for future developers

## Database Schema Quick Reference

### Key Tables
- `users` - User accounts
- `subscriptions` - RevenueCat subscription status
- `assets` - Screenshot metadata
- `cleanup_sessions` - Session tracking
- `cleanup_actions` - Individual actions (keep/delete/archive)
- `usage_counters` - Trust limit tracking

### Important Queries
```sql
-- Get user's remaining deletes
SELECT trust_limit - deletes_used as remaining
FROM usage_counters
WHERE user_id = $1 
AND period_start <= NOW() 
AND period_end >= NOW();

-- Get session stats
SELECT 
  COUNT(*) FILTER (WHERE action = 'delete') as deleted,
  COUNT(*) FILTER (WHERE action = 'archive') as archived
FROM cleanup_actions
WHERE session_id = $1;
```

## API Integration

### Supabase Client
```typescript
import { supabase } from '../lib/supabase/client';

// Fetch user's subscription
const { data } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('user_id', userId)
  .single();
```

### RevenueCat
```typescript
import { purchaseLifetime } from '../lib/revenuecat/client';

const result = await purchaseLifetime();
if (result.success) {
  // Grant premium access
}
```

## Testing Guidelines

### Playwright Tests
Located in `web-demo/tests/app.spec.ts`:
- Test UI rendering
- Test button interactions
- Test state changes
- Test trust limit enforcement

### What to Test
1. Component renders with correct data
2. Actions update state correctly
3. Navigation works between screens
4. Trust counter decrements on delete
5. Paywall shows at limit

### Test Example
```typescript
test('should increment deleted count on delete', async ({ page }) => {
  await page.locator('#delete-btn').click();
  const count = await page.locator('#deleted-count').textContent();
  expect(count).toBe('1');
});
```

## Performance Considerations

### Image Loading
- Use `expo-image` for optimized loading
- Implement lazy loading in grid
- Cache thumbnails

### State Updates
- Batch state updates when possible
- Use selectors to prevent unnecessary re-renders
- Keep stores focused and small

### Database
- Add indexes on frequently queried columns
- Use pagination for large datasets
- Implement proper cleanup of old sessions

## Current Status (PRD Section 6)

### Completed ✅
- Expo app setup with file routing
- Tab navigation (Stack, Vault, Settings)
- The Stack screen with swipe gestures
- The Vault screen with grid selection
- Session Recap screen
- Trust Limiter paywall
- Basic monetization
- Playwright test suite

### In Progress 🔄
- Auth screens (sign-in, onboarding)
- Supabase edge functions
- Error boundaries
- Loading skeletons

### Next Up 📋
- Database migrations
- RevenueCat webhook integration
- Analytics implementation
- TestFlight build

## Commands Reference

```bash
# Development
cd screenshot-organizer
npm start

# Type checking
npx tsc --noEmit

# Testing
cd web-demo
npx playwright test

# Build (requires Node 20+)
npx expo export --platform web
```

## Tips for Success

1. **Start with PRD** - Always read the requirements first
2. **Use Design Tokens** - Never hardcode colors/sizes
3. **Test Early** - Run Playwright tests after each feature
4. **Type Everything** - TypeScript catches bugs early
5. **Keep It Modular** - Small, reusable components
6. **Handle Errors** - Always add error boundaries
7. **Add Feedback** - Haptics make the app feel responsive

## Questions?
If something is unclear in the PRD:
1. Check the HTML design files in `prd/` folders
2. Look at existing implementations for patterns
3. Ask for clarification before building
