# Product Requirements Document

## 1. Design System

### UI Screens (Reference Folders)

| Screen | Folder | Route | Description |
|--------|--------|-------|-------------|
| Sign In | `app/(auth)/` | `sign-in` | Authentication screen |
| Onboarding | `app/(auth)/` | `onboarding` | First-time user onboarding |
| The Stack | `prd/the_stack/` | `(tabs)/inbox` | Card-based swipe triage interface |
| The Vault | `prd/the_vault_(grid)/` | `library` | Grid view for batch selection |
| Session Recap | `prd/session_recap/` | `review-session` | Post-cleanup summary with stats |
| Trust Limiter | `prd/trust_limiter/` | `paywall` | Modal for free tier limits |

### Design Tokens

```
Colors:
  - primary: #38BDF8 (Sky Blue)
  - background: #0F172A (Deep Navy)
  - surface: #1E293B (Slate-800)
  - delete: #EF4444 (Red)
  - keep: #10B981 (Green)
  - archive: #8B5CF6 (Purple)
  - text-primary: #F1F5F9
  - text-muted: #94A3B8

Fonts:
  - display: Space Grotesk (headings)
  - body: Inter (UI text)
  - mono: JetBrains Mono (stats, sizes)

Effects:
  - glass-morphism: bg-white/5 backdrop-blur-xl border-white/10
  - neon-glow: 0 0 15px {color}
  - tech-shadow: 0 10px 0 0 #CBD5E1
```

## 2. App Architecture

```
app/
├── (auth)/
│   ├── _layout.tsx           # Auth layout with redirect logic
│   ├── sign-in.tsx           # Email/password + OAuth sign-in
│   └── onboarding.tsx        # First-time onboarding flow
├── (tabs)/
│   ├── inbox.tsx              # → prd/the_stack/
│   ├── library.tsx            # → prd/the_vault_(grid)/
│   └── settings.tsx
├── review-session.tsx         # → prd/session_recap/
├── paywall.tsx                # → prd/trust_limiter/ (as modal)
└── _layout.tsx

src/
├── components/
│   ├── triage/
│   │   ├── SwipeCard.tsx
│   │   ├── ActionButtons.tsx
│   │   ├── TrustCounter.tsx
│   │   └── AssetMetadata.tsx
│   ├── vault/
│   │   ├── GridItem.tsx
│   │   ├── FilterTabs.tsx
│   │   └── BatchActionBar.tsx
│   ├── recap/
│   │   ├── StatsGrid.tsx
│   │   └── StorageHero.tsx
│   ├── paywall/
│   │   ├── TrustModal.tsx
│   │   └── UpgradeButton.tsx
│   └── auth/
│       ├── AuthForm.tsx      # Sign in/up form component
│       └── OAuthButton.tsx   # Google/Apple OAuth
├── features/
│   ├── screenshot-inbox/
│   │   ├── useTriageSession.ts
│   │   ├── syncAssets.ts     # Sync device assets to Supabase
│   │   └── classifyAssets.ts # AI image classification
│   ├── cleanup-session/
│   │   ├── useCleanupStats.ts
│   │   └── saveSession.ts    # Persist session to Supabase
│   ├── subscriptions/
│   │   ├── useEntitlement.ts
│   │   └── syncSubscription.ts
│   └── analytics/
│       └── events.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── types.ts
│   │   └── queries.ts        # Database query helpers
│   ├── revenuecat/
│   │   └── client.ts
│   └── media-library/
│       └── assets.ts
├── state/
│   ├── session.store.ts
│   ├── selection.store.ts
│   ├── entitlement.store.ts
│   └── auth.store.ts         # Auth state management
└── hooks/
    ├── useInbox.ts
    ├── useGallery.ts
    ├── useSwipeGestures.ts
    ├── useAuth.ts            # Auth hook with auto-redirect
    └── useSessionSync.ts     # Sync session to Supabase

supabase/
├── docker-compose.yml         # Self-hosted Supabase stack
├── .env.example
├── volumes/
│   ├── api/kong.yml
│   ├── db/
│   ├── storage/
│   └── logs/
├── migrations/
└── functions/
    ├── entitlement-sync/     # RevenueCat webhook handler
    │   └── index.ts
    ├── usage-enforce/        # Trust limit check
    │   └── index.ts
    ├── u/         # Analytics batch insert
    │   └── index.ts
    └── classify-image/       # AI image classification
        └── index.ts
```

## 3. Infrastructure (Self-Hosted Supabase)

### 3.1 Docker Compose Stack

The app uses **self-hosted Supabase** via Docker Compose:
- PostgreSQL 15 (primary database)
- Supabase Auth (GoTrue) - JWT-based authentication
- Supabase Storage - File storage for screenshots
- Supabase Edge Functions - Deno runtime for serverless functions
- Kong API Gateway - Routes all API requests
- Supabase Studio - Database UI
- Realtime - WebSocket subscriptions
- Analytics/Logs - Vector + Logflare

### 3.2 Quick Start

```bash
# 1. Start the backend
cd supabase
cp .env.example .env
# Edit .env with your values
docker compose up -d

# 2. Check services
docker compose ps

# 3. Access Supabase Studio (DB UI)
open http://localhost:8000

# 4. Run migrations
docker exec supabase-db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/migrations-custom/001_initial_schema.sql

# 5. Configure mobile app
cd ../screenshot-organizer
cp .env.example .env
# Edit EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# 6. Start the mobile app
npm start
```

### 3.3 Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| Kong (API Gateway) | 8000 | Main API endpoint |
| Supabase Studio | 8000/project/default | Database UI |
| PostgreSQL | 5432 | Direct DB access |
| Auth (GoTrue) | 9999 | Authentication API |
| Storage | 5000 | File storage API |
| Edge Functions | 54321 | Functions runtime |

### 3.4 Environment Variables

**Backend** (`supabase/.env`):
```env
POSTGRES_PASSWORD=your-super-secret-password
JWT_SECRET=your-jwt-secret-at-least-32-chars-long
ANON_KEY=eyJhbG...
SERVICE_ROLE_KEY=eyJhbG...
SITE_URL=http://localhost:8081
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=this_is_not_a_secure_password
```

**Mobile App** (`screenshot-organizer/.env`):
```env
EXPO_PUBLIC_SUPABASE_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_REVENUECAT_API_KEY=your-revenuecat-key
```

**AI Configuration** (in `supabase/functions/classify-image/index.ts`):
```typescript
// Google Gemini API - configured in edge function
const GEMINI_API_KEY = 'AIzaSyBL64Bi89KavirAsogPwgWUPPMJgHffTdA'
const GEMINI_MODEL = 'gemini-1.5-flash'  // Fast and cost-effective
```
**Note:** For production, move API key to environment variables in `supabase/.env`

## 4. Complete Data Flow

### 4.1 Authentication Flow

```
User opens app
    ↓
Check auth status (supabase.auth.getSession())
    ↓
IF no session → SignIn screen
    ↓
User enters email/password OR clicks OAuth
    ↓
supabase.auth.signInWithPassword() OR signInWithOAuth()
    ↓
Auth successful → Supabase triggers handle_new_user()
    ↓
Creates user record in public.users
Creates free subscription in public.subscriptions
    ↓
Redirect to onboarding (if first time) OR (tabs)/inbox
```

**Implementation:**
```typescript
// src/hooks/useAuth.ts
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { session, loading, signIn, signUp, signOut }
}
```

### 4.2 Session Management Flow

```
User opens The Stack (inbox.tsx)
    ↓
useGallery() loads screenshots from device
    ↓
useSessionStore.startSession(assets) creates local session
    ↓
User swipes/ taps action on screenshot
    ↓
Local state updates immediately (optimistic UI)
    ↓
Action recorded in local store
    ↓
IF delete action:
  - Check trust limit via entitlement store
  - IF at limit → Show paywall
  - ELSE → Delete from device + increment counter
    ↓
User completes session (all screenshots reviewed)
    ↓
Navigate to review-session.tsx
    ↓
Display stats from local session store
    ↓
User taps "Finish Session"
    ↓
Call saveSessionToSupabase()
    ↓
Insert into cleanup_sessions table
Insert all actions into cleanup_actions table
Update usage_counters
    ↓
Clear local session
    ↓
Return to (tabs)/inbox
```

**Implementation:**
```typescript
// src/features/cleanup-session/saveSession.ts
export async function saveSessionToSupabase(
  session: SessionState,
  userId: string
) {
  // 1. Create cleanup session record
  const { data: sessionRecord, error: sessionError } = await supabase
    .from('cleanup_sessions')
    .insert({
      user_id: userId,
      started_at: new Date(session.startTime!).toISOString(),
      ended_at: new Date().toISOString(),
      reviewed_count: session.actions.length,
      deleted_count: session.actions.filter(a => a.action === 'delete').length,
      archived_count: session.actions.filter(a => a.action === 'archive').length,
      saved_bytes: calculateSavedBytes(session),
    })
    .select()
    .single()

  if (sessionError) throw sessionError

  // 2. Create cleanup actions records
  const actions = session.actions.map(action => ({
    session_id: sessionRecord.id,
    asset_id: action.assetId,
    action: action.action,
    action_at: new Date(action.timestamp).toISOString(),
  }))

  const { error: actionsError } = await supabase
    .from('cleanup_actions')
    .insert(actions)

  if (actionsError) throw actionsError

  // 3. Update usage counters
  const deletedCount = session.actions.filter(a => a.action === 'delete').length
  await supabase.rpc('increment_deletes_used', {
    p_user_id: userId,
    p_count: deletedCount,
  })

  return sessionRecord
}
```

### 4.3 Trust Limit Enforcement Flow

```
User attempts delete action
    ↓
Local check: entitlement === 'free' && deletesRemaining <= 0
    ↓
IF at limit:
  Show paywall modal
    ↓
  User taps "Unlock Unlimited"
    ↓
  RevenueCat purchase flow
    ↓
  On success → Call entitlement-sync edge function
    ↓
  Update subscriptions table
    ↓
  Update local entitlement store
    ↓
  Close paywall, continue session
    ↓
ELSE (not at limit):
  Record delete action locally
  Delete asset from device
  Increment local deletes counter
  Decrement deletesRemaining in store
```

### 4.4 AI Image Classification Flow

```
User opens The Stack (inbox.tsx)
    ↓
useGallery() loads screenshots from device
    ↓
Classify images via classifyAssets() in background
    ↓
Convert image to base64 (imageToBase64 function)
    ↓
Call classify-image edge function for each asset
    ↓
Edge function sends image to Google Gemini API:
  - Model: gemini-1.5-flash
  - Prompt: "Classify this image into categories..."
  - Image data: base64 encoded
    ↓
Gemini AI analyzes image content and returns:
  "receipt, screenshot" or "meme" or "chat, error"
    ↓
Edge function parses response into tags array
    ↓
Fallback to heuristics if Gemini fails:
  - Filename analysis
  - Aspect ratio
  - File size
    ↓
Update assets with tags in local state
    ↓
Display tag badge on screenshot card (e.g., "#RECEIPT")
    ↓
In Vault view: Allow filtering by tag
    ↓
Suggested deletes based on tags + age:
  - Old memes (> 1 week) → suggest delete
  - Old errors (> 1 month) → suggest delete
  - Old chat screenshots (> 2 weeks) → suggest delete
```

**Implementation:**
```typescript
// src/features/screenshot-inbox/classifyAssets.ts
async function imageToBase64(uri: string): Promise<string> {
  const response = await fetch(uri)
  const blob = await response.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      resolve(base64.split(',')[1]) // Remove data URL prefix
    }
    reader.readAsDataURL(blob)
  })
}

export async function classifyAssets(assets: Asset[]) {
  for (const asset of assets) {
    // Convert image to base64
    const imageBase64 = await imageToBase64(asset.uri)
    
    const { data } = await supabase.functions.invoke('classify-image', {
      body: {
        asset_id: asset.id,
        filename: asset.filename,
        width: asset.width,
        height: asset.height,
        size_bytes: asset.size,
        user_id: user.id,
        image_base64: imageBase64, // Send image to Gemini
      },
    })
    asset.tags = data.tags
  }
  return assets
}

// supabase/functions/classify-image/index.ts
async function classifyWithGemini(imageBase64: string, filename: string) {
  const prompt = `Analyze this image and classify it into one or more categories.
  Available: receipt, chat, meme, error, article, photo, document, code, map, ticket, screenshot
  Respond with ONLY the category names separated by commas.`
  
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 50 }
    })
  })
  
  const data = await response.json()
  const text = data.candidates[0].content.parts[0].text
  
  // Parse tags from response
  return text.toLowerCase().split(/[,\s]+/).filter(tag => VALID_TAGS.includes(tag))
}
```

**Implementation:**
```typescript
// src/hooks/useInbox.ts
const handleAction = useCallback(async (action: ActionType) => {
  if (action === 'delete' && entitlement === 'free' && deletesRemaining <= 0) {
    // Show paywall
    router.push('/paywall')
    return 'paywall'
  }

  // Record action locally
  recordAction(action)
  
  if (action === 'delete') {
    decrementDeletes()
    await deleteAsset(currentAsset.id)
  }
  
  nextAsset()
}, [currentAsset, entitlement, deletesRemaining])
```

### 4.4 Vault (Grid) Batch Operations Flow

```
User navigates to Vault (library.tsx)
    ↓
Load assets from device (useGallery)
    ↓
Display 3-column grid
    ↓
User taps items to select
    ↓
Toggle selection in selection store
    ↓
Update UI (checkmark + red overlay)
    ↓
"Delete (n)" button appears
    ↓
User taps delete button
    ↓
Confirmation dialog
    ↓
Delete selected assets from device
    ↓
Clear selection
    ↓
Show success toast
```

## 5. Screen Specifications

### 5.1 Authentication

**Route:** `(auth)/sign-in`

**Components:**
- `AuthForm`: Email/password inputs with validation
- `OAuthButton`: Google Sign-In, Apple Sign-In
- `ErrorDisplay`: Auth error messages

**Data Flow:**
1. User enters credentials
2. Call `supabase.auth.signInWithPassword()`
3. On success, check if onboarding needed
4. Redirect to appropriate screen

**Route:** `(auth)/onboarding`

**Components:**
- Swipeable onboarding slides
- Permission request (photo library access)
- "Get Started" button

**Data Flow:**
1. Show feature highlights
2. Request media library permission
3. On complete, redirect to (tabs)/inbox

### 5.2 The Stack (Inbox/Triage)

**Route:** `(tabs)/inbox`

**Components:**
- `TrustCounter`: Pill badge showing "Daily Trust X/15" with progress bar
- `SwipeCard`: Full-width card showing screenshot with:
  - Asset preview image
  - Age badge (e.g., "420d old")
  - Size badge (e.g., "2.8 MB")
  - Format badge (e.g., "PNG")
  - Tag chip (e.g., "#RECEIPT")
- `ActionButtons`: Three buttons:
  - Delete (red, X icon) - swipe left
  - Archive (purple, unarchive icon) - center
  - Keep (green, check icon) - swipe right

**Data Flow:**
1. Load screenshots from device via `useGallery()`
2. Initialize session in `useSessionStore`
3. Display current screenshot
4. On action (swipe/button):
   - Record action locally
   - Update device storage
   - Move to next screenshot
5. On completion, navigate to review-session

**Trust Counter Logic:**
- Free users: 15 deletes per 24h session
- Premium/lifetime: Unlimited

### 5.3 The Vault (Grid/Library)

**Route:** `(tabs)/library`

**Components:**
- `FilterTabs`: Horizontal scroll - "All Items", "Screenshots", "Oldest", "Largest"
- `GridItem`: 3-column grid cells with:
  - Thumbnail image
  - Size badge (bottom-right)
  - Selection checkmark (top-right, when selected)
  - Red overlay when selected for deletion
- `BatchActionBar`: Floating "Delete (n)" button

**Data Flow:**
1. Load screenshots from device
2. Display in grid
3. On tap: toggle selection
4. On batch delete:
   - Delete from device
   - Clear selection
   - Show success feedback

### 5.4 Session Recap

**Route:** `review-session`

**Components:**
- `StorageHero`: Large "142 MB" display with animated glow
- `StatsGrid`: 3-column grid showing:
  - Deleted count (red, delete_sweep icon)
  - Archived count (purple, auto_awesome icon)
  - Time spent (gray, bolt icon)
- `FinishButton`: "FINISH SESSION" with arrow
- `ShareButton`: "Share Stats" with share icon

**Data Flow:**
1. Read session stats from local store
2. Display calculated metrics
3. On "Finish":
   - Save session to Supabase
   - Clear local session
   - Navigate back to inbox

**Data Sources:**
```
deleted_count: cleanup_sessions.deleted_count
archived_count: COUNT(cleanup_actions WHERE action='archive')
saved_bytes: cleanup_sessions.saved_bytes
time_spent: ended_at - started_at
```

### 5.5 Trust Limiter (Paywall Modal)

**Trigger:** When free user attempts delete > trust limit

**Components:**
- `TrustModal`: Glass morphism modal with:
  - Lock icon in progress ring
  - "Trust Capacity Reached" heading
  - Explanatory text about 15 delete limit
- `UpgradeButton`: "Unlock Unlimited - $4.99" gradient button
- `WaitOption`: "Wait 24h for next session" text link

**Data Flow:**
1. Detect trust limit reached
2. Show paywall modal
3. On upgrade:
   - Trigger RevenueCat purchase
   - Call edge function to update subscription
   - Close modal
4. On wait: close modal, return to stack

## 6. Database Schema (Supabase)

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, references auth.users |
| email | text | Unique |
| created_at | timestamp | Auto |
| timezone | text | Default 'UTC' |

### subscriptions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users.id |
| provider | text | "revenuecat" |
| entitlement | text | "free" \| "premium" \| "lifetime" |
| status | text | "active" \| "cancelled" \| "expired" |
| expires_at | timestamp | Nullable |
| updated_at | timestamp | Auto |
| created_at | timestamp | Auto |

### assets
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users.id |
| platform_asset_id | text | iOS/Android photo ID |
| type | text | "screenshot" |
| created_at_device | timestamp | When screenshot taken |
| size_bytes | bigint | File size |
| hash | text | For deduplication |
| tags | text[] | ["receipt", "meme", etc.] |
| created_at | timestamp | Auto |

### cleanup_sessions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users.id |
| started_at | timestamp | Session start |
| ended_at | timestamp | Session end |
| reviewed_count | integer | Total reviewed |
| deleted_count | integer | Deleted count |
| archived_count | integer | Archived count |
| saved_bytes | bigint | Space reclaimed |

### cleanup_actions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| session_id | uuid | FK → cleanup_sessions.id |
| asset_id | uuid | FK → assets.id |
| action | text | "keep" \| "delete" \| "archive" \| "undo" |
| action_at | timestamp | When action taken |

### usage_counters
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users.id |
| period_start | timestamp | Start of period |
| period_end | timestamp | End of period |
| deletes_used | integer | Current count |
| trust_limit | integer | Default 15 |

### analytics_events
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users.id (nullable) |
| event_name | text | Event type |
| properties | jsonb | Event data |
| created_at | timestamp | Auto |

## 7. API Boundary

### 7.1 Client (Expo)

**Hooks:**
- `useAuth()`: Authentication state and methods
- `useGallery()`: Read device screenshots via expo-media-library
- `useSessionSync()`: Sync local session to Supabase
- `useInbox()`: Manage screenshot queue and actions
- `useEntitlement()`: Check subscription status

**State Stores:**
- `auth.store.ts`: Auth session, user data
- `session.store.ts`: Current triage session
- `selection.store.ts`: Multi-select in vault
- `entitlement.store.ts`: Subscription status

### 7.2 Supabase Edge Functions

**entitlement-sync:**
```typescript
// Trigger: RevenueCat webhook
// Purpose: Update subscriptions table on purchase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { event, subscriber } = await req.json()
  
  if (event === 'INITIAL_PURCHASE' || event === 'RENEWAL') {
    const entitlement = subscriber.entitlements['premium']
    
    await supabase.from('subscriptions').upsert({
      user_id: subscriber.app_user_id,
      provider: 'revenuecat',
      entitlement: entitlement.expiration_date ? 'premium' : 'lifetime',
      status: 'active',
      expires_at: entitlement.expiration_date,
    })
  }
  
  return new Response(JSON.stringify({ success: true }))
})
```

**usage-enforce:**
```typescript
// Purpose: Check trust limit before delete

serve(async (req) => {
  const { user_id } = await req.json()
  
  const { data: counter } = await supabase
    .from('usage_counters')
    .select('*')
    .eq('user_id', user_id)
    .single()
  
  const remaining = counter.trust_limit - counter.deletes_used
  
  return new Response(JSON.stringify({
    can_delete: remaining > 0,
    remaining,
  }))
})
```

**event-ingest:**
```typescript
// Purpose: Batch insert analytics events

serve(async (req) => {
  const { events } = await req.json()
  
  await supabase.from('analytics_events').insert(events)
  
  return new Response(JSON.stringify({ success: true }))
})
```

**classify-image:**
```typescript
// Purpose: AI-powered image classification using Google Gemini API

const GEMINI_API_KEY = 'AIzaSyBL64Bi89KavirAsogPwgWUPPMJgHffTdA'
const GEMINI_MODEL = 'gemini-1.5-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

serve(async (req) => {
  const { asset_id, filename, width, height, size_bytes, user_id, image_base64 } = await req.json()
  
  let tags: string[] = []
  let method = 'heuristic'
  
  // Try Gemini AI classification if image data available
  if (image_base64) {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Classify this image into categories: receipt, chat, meme, error, article, photo, document, code, map, ticket, screenshot' },
              { inline_data: { mime_type: "image/jpeg", data: image_base64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 50 }
        })
      })
      
      const data = await response.json()
      const classificationText = data.candidates[0].content.parts[0].text
      
      // Parse tags from Gemini response
      tags = classificationText
        .toLowerCase()
        .split(/[,\s]+/)
        .filter(tag => VALID_TAGS.includes(tag))
      
      method = 'gemini'
    } catch (geminiError) {
      console.error('Gemini failed:', geminiError)
      // Fall back to heuristics
      tags = classifyWithHeuristics(filename, width/height, size_bytes)
      method = 'heuristic (fallback)'
    }
  } else {
    // No image data, use heuristics only
    tags = classifyWithHeuristics(filename, width/height, size_bytes)
  }
  
  // Update asset with tags
  await supabase.from('assets').update({ tags }).eq('id', asset_id)
  
  return new Response(JSON.stringify({ success: true, tags, method }))
})
```

### 7.3 Database Functions

**increment_deletes_used:**
```sql
CREATE OR REPLACE FUNCTION increment_deletes_used(
  p_user_id UUID,
  p_count INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE usage_counters
  SET deletes_used = deletes_used + p_count
  WHERE user_id = p_user_id
  AND period_end > NOW();
END;
$$ LANGUAGE plpgsql;
```

### 7.4 RevenueCat Integration

- Product ID: `unlimited_lifetime` ($4.99)
- Entitlement: `premium`
- Webhook → `entitlement-sync` function

## 8. Execution Plan

### Phase 1: Foundation ✅
- [x] Docker Compose setup for Supabase
- [x] Environment configuration
- [x] Database migrations with RLS policies
- [x] Expo app with file-based routing
- [x] Design tokens in `src/lib/theme.ts`
- [x] Tab navigation shell (Stack, Vault, Settings)

### Phase 2: Authentication ✅
- [x] Sign-in screen with email/password - `app/(auth)/sign-in.tsx`
- [ ] OAuth integration (Google, Apple) - placeholder ready
- [x] Onboarding flow - `app/(auth)/onboarding.tsx`
- [x] Auth state management - `src/state/auth.store.ts`
- [x] Protected routes middleware - `app/_layout.tsx`

### Phase 3: The Stack ✅
- [x] `useGallery()` hook - `src/hooks/useGallery.ts`
- [x] Swipe gestures - `app/(tabs)/inbox.tsx`
- [x] Action buttons with haptics - implemented
- [x] TrustCounter badge - implemented
- [x] Session state management - `src/state/session.store.ts`

### Phase 4: The Vault ✅
- [x] Grid view - `app/(tabs)/library.tsx`
- [x] Filter tabs - implemented
- [x] Batch delete - implemented
- [x] Selection overlay - implemented

### Phase 5: Session Recap ✅
- [x] StorageHero - `app/review-session.tsx`
- [x] StatsGrid - implemented
- [x] Session completion - implemented
- [x] Share functionality - implemented
- [x] Persist session to Supabase - `src/features/cleanup-session/saveSession.ts`

### Phase 6: Trust & Monetization ✅
- [x] Trust limit enforcement (local)
- [x] Paywall modal UI - `app/paywall.tsx`
- [ ] RevenueCat SDK integration - placeholder
- [x] `entitlement-sync` edge function - `supabase/functions/entitlement-sync/`
- [x] `usage-enforce` edge function - `supabase/functions/usage-enforce/`
- [x] Subscription sync via edge functions

### Phase 7: Edge Functions ✅
- [x] `entitlement-sync` - RevenueCat webhook handler
- [x] `usage-enforce` - Trust limit check
- [x] `event-ingest` - Analytics batch insert
- [x] `classify-image` - AI image classification
- [x] `increment_deletes_used` - Database function

### Phase 8: AI Classification ✅
- [x] Image classification edge function - `supabase/functions/classify-image/`
- [x] Google Gemini API integration - gemini-1.5-flash model
- [x] Image base64 encoding for API - `src/features/screenshot-inbox/classifyAssets.ts`
- [x] Display tags in The Stack - tag badge with color coding
- [x] Tag filters in The Vault - filter by tag buttons
- [x] Suggested deletes based on tags + age
- [x] Heuristic fallback when AI fails

### Phase 9: Testing ✅
- [x] TypeScript - no errors
- [x] Playwright tests - 10/10 passing
- [ ] Error boundaries - pending
- [ ] Loading skeletons - basic only
- [x] Haptic feedback - implemented
- [x] Analytics events - client-side + edge function

## 9. Technical Notes

### Screenshot Detection
```typescript
// Filter for screenshots only
const screenshots = await MediaLibrary.getAssetsAsync({
  mediaType: 'photo',
  sortBy: ['creationTime'],
  first: 100,
});
// Platform-specific screenshot detection:
// iOS: Check if image dimensions match device screen
// Android: Check DCIM/Screenshots folder path
```

### Swipe Gesture Thresholds
```typescript
const SWIPE_THRESHOLD = 100; // pixels
const SWIPE_VELOCITY = 500;  // pixels/second
```

### Trust Limit Reset
- Reset at midnight in user's timezone
- Or 24h from first delete in session

### Glass Morphism (React Native)
```typescript
// Use expo-blur for backdrop blur
import { BlurView } from 'expo-blur';
<BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
  {/* content */}
</BlurView>
```

## 10. Docker Commands Reference

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

## 11. Local Development Workflow

1. **Start Backend**:
   ```bash
   cd supabase
   docker compose up -d
   ```

2. **Apply Migrations**:
   ```bash
   docker exec supabase-db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/migrations-custom/001_initial_schema.sql
   ```

3. **Configure Environment**:
   ```bash
   cd ../screenshot-organizer
   cp .env.example .env
   # Edit with your values from supabase/.env
   ```

4. **Start Mobile App**:
   ```bash
   npm start
   ```

5. **Access Studio** (Database UI):
   - Open http://localhost:8000
   - Username: `supabase`
   - Password: `this_is_not_a_secure_password`

## 12. Troubleshooting

### Docker Issues
- **Port conflicts**: Make sure ports 8000, 5432, 9999 are free
- **Memory issues**: Increase Docker memory limit to 4GB+
- **Volume permissions**: Run `sudo chown -R $USER:$USER supabase/volumes/`

### Database Connection
- Check `docker compose ps` to ensure db is healthy
- Verify `.env` values match between backend and frontend
- Test connection: `docker exec -it supabase-db psql -U postgres`

### Auth Issues
- Check GoTrue logs: `docker compose logs auth`
- Verify SITE_URL matches your app URL
- Check JWT_SECRET is at least 32 characters

### Node.js Version
Expo requires Node.js 20+. If you have an older version:
- Use `nvm` to switch versions
- Or develop against the web demo only
