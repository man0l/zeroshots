import { supabase, edgeFn } from '../../lib/supabase/client'

export interface TagSuggestion {
  rawLabel: string
  count: number
}

export interface TagSuggestionsResponse {
  suggestions: TagSuggestion[]
}

/**
 * Fetch tag suggestions from unmapped raw labels in analytics_events.
 * Only returns data for the authenticated user (RLS).
 * Requires mlLogsEnabled to have contributed data.
 */
export async function fetchTagSuggestions(
  options?: { minCount?: number; limit?: number }
): Promise<{ data: TagSuggestion[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(edgeFn('get-tag-suggestions'), {
      body: options ?? {},
    })

    if (error) return { data: null, error }
    const body = data as TagSuggestionsResponse | null
    return { data: body?.suggestions ?? [], error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) }
  }
}
