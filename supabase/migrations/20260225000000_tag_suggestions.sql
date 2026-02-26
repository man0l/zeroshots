-- Migration: Tag suggestions from unmapped raw labels in analytics_events
-- Returns raw labels that frequently appear in ml_classification events where
-- the only mapped tag is 'screenshot' (i.e. labels that did not map to any tag).
-- RLS applies: users only see their own analytics_events.

CREATE OR REPLACE FUNCTION screenshot_organizer.get_unmapped_raw_label_suggestions(
  p_min_count INTEGER DEFAULT 3,
  p_limit     INTEGER DEFAULT 20
)
RETURNS TABLE (
  raw_label   TEXT,
  event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
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
  HAVING COUNT(*) >= p_min_count
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION screenshot_organizer.get_unmapped_raw_label_suggestions(INTEGER, INTEGER) IS
  'Returns raw labels from ml_classification events where mapped_tags = [screenshot]. RLS applies: users only see their own data.';

GRANT EXECUTE ON FUNCTION screenshot_organizer.get_unmapped_raw_label_suggestions(INTEGER, INTEGER) TO authenticated;
