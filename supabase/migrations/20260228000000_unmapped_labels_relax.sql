-- Relax unmapped-label suggestions: show all raw labels regardless of mapped_tags,
-- fix el.val → el (jsonb_array_elements_text returns text directly, not a record),
-- lower min_count default to 1.
-- Fixes "no unmapped labels" when records exist.

CREATE OR REPLACE FUNCTION screenshot_organizer.get_unmapped_raw_label_suggestions(
  p_min_count INTEGER DEFAULT 1,
  p_limit     INTEGER DEFAULT 20
)
RETURNS TABLE (
  raw_label   TEXT,
  event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lower(trim(el))::TEXT AS raw_label,
    COUNT(*)::BIGINT AS event_count
  FROM screenshot_organizer.analytics_events e,
       jsonb_array_elements_text(COALESCE(e.properties->'raw_labels', '[]'::jsonb)) el
  WHERE e.event_name = 'ml_classification'
    AND jsonb_array_length(COALESCE(e.properties->'raw_labels', '[]'::jsonb)) > 0
  GROUP BY lower(trim(el))
  HAVING COUNT(*) >= p_min_count
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION screenshot_organizer.get_unmapped_raw_label_suggestions(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION screenshot_organizer.get_unmapped_raw_label_suggestions(INTEGER, INTEGER) IS
  'Returns all raw labels from ml_classification events ordered by frequency. Default min_count=1. RLS applies.';
