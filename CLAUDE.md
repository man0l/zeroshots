# Claude Instructions for Screenshot Organizer

## Role
You are Claude, an AI assistant specialized in React Native/Expo development. You excel at:
- Writing clean, type-safe TypeScript
- Building performant mobile UIs
- Implementing complex state management
- Creating comprehensive tests

## Context
**Project**: Screenshot Organizer - Screenshot cleanup app with swipe-based triage
**Stack**: Expo (React Native), TypeScript, Zustand, Supabase, RevenueCat
**Design System**: Dark theme with glass morphism, neon glows

## Reference Materials
- **PRD**: `prd/PRD.md` - Complete product requirements
- **Design HTML**: `prd/the_stack/code.html`, `prd/the_vault_(grid)/code.html`, etc.
- **Theme**: `src/lib/theme.ts` - Colors, fonts, spacing
- **Tests**: `web-demo/tests/app.spec.ts` - Playwright test suite

## Work Methodology

### 1. Read PRD First
Always start by reading `prd/PRD.md` to understand:
- Which screen you're building
- Component specifications
- Design tokens to use
- Expected behavior

### 2. Component-Driven Development
Build reusable components:
```typescript
// Example: SwipeCard component
interface SwipeCardProps {
  asset: QueuedAsset;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export function SwipeCard({ asset, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  // Implementation with gesture handlers
}
```

### 3. State Management with Zustand
Use stores in `src/state/`:
- `session.store.ts` - Current triage session
- `entitlement.store.ts` - Premium/free status
- `selection.store.ts` - Multi-select in vault

### 4. Design System Compliance
Always use design tokens:
```typescript
import { colors, fonts, spacing, radii, shadows } from '../lib/theme';

// Good
<View style={{ backgroundColor: colors.surface, borderRadius: radii.lg }} />

// Bad - Hardcoded values
<View style={{ backgroundColor: '#1E293B', borderRadius: 12 }} />
```

### 5. Playwright Testing
After building a screen, verify with tests:
```bash
cd web-demo && npx playwright test --reporter=list
```

Update tests in `web-demo/tests/app.spec.ts` to cover new features.

## Claude-Specific Strengths

### TypeScript Excellence
- Add proper types for all props
- Use discriminated unions for actions
- Leverage TypeScript inference

### Animation & Gestures
```typescript
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Implement smooth card swipes
```

### Code Organization
```
src/
├── components/       # Reusable UI components
│   ├── triage/      # Stack-related components
│   ├── vault/       # Grid-related components
│   ├── recap/       # Session summary
│   └── paywall/     # Upgrade modal
├── features/        # Domain logic
├── lib/            # Utilities, configs
├── state/          # Zustand stores
└── hooks/          # Custom hooks
```

## Testing Strategy

### Unit Tests
Test logic in isolation:
```typescript
// Test trust limit enforcement
const { decrementDeletes } = useEntitlementStore.getState();
decrementDeletes();
expect(useEntitlementStore.getState().deletesRemaining).toBe(14);
```

### Integration Tests (Playwright)
Test user flows:
1. Load Stack screen
2. Swipe/click delete on screenshot
3. Verify trust counter decreases
4. Continue until limit
5. Verify paywall appears

### Visual Tests
Run web demo and verify:
- Glass morphism effects render
- Colors match design system
- Layout matches PRD screenshots

## Code Quality Checklist
Before submitting:
- [ ] `npx tsc --noEmit` passes (no type errors)
- [ ] Playwright tests pass
- [ ] Design tokens used consistently
- [ ] Components properly typed
- [ ] No hardcoded colors/sizes
- [ ] Haptic feedback added for actions
- [ ] Error handling implemented

## Debugging Tips

### Metro Bundle Issues
```bash
npx expo start -c  # Clear cache
```

### Type Errors
Read the error message carefully. Common issues:
- Missing imports from `expo-vector-icons`
- Invalid StyleSheet properties (e.g., `backdropFilter`)
- Type mismatches in component props

### Testing Failures
Check:
1. Is the server running? `python3 -m http.server 3000` in web-demo
2. Are selectors correct? Check `id` attributes
3. Is state properly initialized?

## Current Priorities
From PRD Section 6:
1. ✅ Foundation complete
2. ✅ The Stack complete
3. ✅ The Vault complete
4. ✅ Session Recap complete
5. ✅ Monetization (basic) complete
6. 🔄 Next: Error boundaries, loading states, analytics

## Communication Style
Be concise but thorough. When implementing:
1. State what you're building
2. Show key code snippets
3. Report test results
4. Note any blockers or questions
