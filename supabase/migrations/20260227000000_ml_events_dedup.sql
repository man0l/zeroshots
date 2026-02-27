-- Remove duplicate ml_classification events, keeping one per (user_id, created_at, filename).
-- Duplicates accumulate when the app is killed after logging but before the classification cache
-- is persisted: the next cold-start re-classifies and re-logs the same asset.
DELETE FROM screenshot_organizer.analytics_events
WHERE event_name = 'ml_classification'
  AND id IN (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY user_id, event_name, created_at, properties->>'filename'
               ORDER BY id
             ) AS rn
      FROM screenshot_organizer.analytics_events
      WHERE event_name = 'ml_classification'
    ) t
    WHERE rn > 1
  );

-- Unique index prevents future duplicates for ml_classification events.
-- event-ingest uses Prefer: resolution=ignore-duplicates so inserts silently no-op on conflict.
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_events_ml_dedup
  ON screenshot_organizer.analytics_events (
    user_id,
    event_name,
    created_at,
    (COALESCE(properties->>'filename', ''))
  )
  WHERE event_name = 'ml_classification';
