# Querying ML logs in Supabase

ML classification events are stored in **`screenshot_organizer.analytics_events`** with `event_name = 'ml_classification'`.

**Schema:** All app and edge-function code use **`screenshot_organizer`** (not `public`). On remote (api.zenmanager.eu), PostgREST must expose it via `PGRST_DB_SCHEMAS=public,screenshot_organizer` (see PRODUCTION_SETUP.md).

## Where to run

- **Remote (api.zenmanager.eu)**: Use your project’s **Supabase Studio** (Dashboard) → **SQL Editor**. The anon key cannot SELECT this table (only `authenticated` can); Studio uses elevated privileges so the query runs.
- **Local**: SQL Editor at http://localhost:8001 (if running local Supabase).

## Recent ML classification events (last 50)

```sql
SELECT
  id,
  user_id,
  created_at,
  properties->>'source'    AS source,
  properties->>'platform'   AS platform,
  properties->'raw_labels'  AS raw_labels,
  properties->'mapped_tags' AS mapped_tags,
  properties->>'filename'  AS filename
FROM screenshot_organizer.analytics_events
WHERE event_name = 'ml_classification'
ORDER BY created_at DESC
LIMIT 50;
```

## Count by source (iOS Vision vs Android ML Kit)

```sql
SELECT
  properties->>'source' AS source,
  properties->>'platform' AS platform,
  COUNT(*) AS count
FROM screenshot_organizer.analytics_events
WHERE event_name = 'ml_classification'
GROUP BY properties->>'source', properties->>'platform'
ORDER BY count DESC;
```

## Sample of raw labels and mapped tags

```sql
SELECT
  created_at,
  properties->>'source'   AS source,
  properties->'raw_labels' AS raw_labels,
  properties->'mapped_tags' AS mapped_tags
FROM screenshot_organizer.analytics_events
WHERE event_name = 'ml_classification'
ORDER BY created_at DESC
LIMIT 10;
```

## Unmapped raw label suggestions (tag suggestions)

Returns raw labels that frequently appear in `ml_classification` events where the only mapped tag is `screenshot`—i.e. labels that did not map to any tag. These are good candidates for new tags or keyword mappings in `LABEL_TO_TAG`.

**Function:** `screenshot_organizer.get_unmapped_raw_label_suggestions(p_min_count, p_limit)`

- `p_min_count` (default 3): Minimum event count to include a label
- `p_limit` (default 20): Max number of suggestions to return
- RLS applies: users only see their own data

**Direct SQL (equivalent logic):**

```sql
SELECT
  lower(trim(el.val))::TEXT AS raw_label,
  COUNT(*)::BIGINT AS event_count
FROM screenshot_organizer.analytics_events e,
     jsonb_array_elements_text(COALESCE(e.properties->'raw_labels', '[]'::jsonb)) el
WHERE e.event_name = 'ml_classification'
  AND jsonb_array_length(COALESCE(e.properties->'raw_labels', '[]'::jsonb)) > 0
  AND (
    e.properties->'mapped_tags' = '["screenshot"]'::jsonb
    OR (jsonb_array_length(COALESCE(e.properties->'mapped_tags', '[]'::jsonb)) = 1
        AND e.properties->'mapped_tags'->>0 = 'screenshot')
  )
GROUP BY lower(trim(el.val))
HAVING COUNT(*) >= 3
ORDER BY COUNT(*) DESC
LIMIT 20;
```

**Invoke via edge function:** `get-tag-suggestions` (authenticated, uses JWT). Returns `{ suggestions: [{ rawLabel, count }] }`.

**Client:** `fetchTagSuggestions()` in `screenshot-organizer/src/features/analytics/tagSuggestions.ts` calls the edge function. Shown in Settings under AI Features when "Store ML logs" is enabled.

## Note

- RLS: authenticated users can only `SELECT` their own rows (`user_id = auth.uid()`). Use the service role or a DB user with full access to see all events.
- The `event-ingest` function inserts with the request’s JWT, so `user_id` is set when the app is logged in.
