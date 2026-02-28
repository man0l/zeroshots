-- Filter generic/noise raw labels from tag suggestions.
-- "screenshot" appears on virtually every event (it's the ML Kit base label
-- for any screenshot) and is not a useful custom tag suggestion.

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
    AND lower(trim(el)) NOT IN ('screenshot', 'text', 'font')
  GROUP BY lower(trim(el))
  HAVING COUNT(*) >= p_min_count
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION screenshot_organizer.get_unmapped_raw_label_suggestions(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION screenshot_organizer.get_unmapped_raw_label_suggestions(INTEGER, INTEGER) IS
  'Returns raw labels from ml_classification events, excluding generic noise labels (screenshot, text, font). RLS applies.';
