import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Authorization required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        db: { schema: 'screenshot_organizer' },
        global: { headers: { Authorization: authHeader } },
      }
    )

    let minCount = 3
    let limit = 10
    if (req.method === 'POST' && req.headers.get('Content-Type')?.includes('application/json')) {
      try {
        const body = await req.json()
        if (body.minCount != null) minCount = Math.max(1, Number(body.minCount))
        if (body.limit != null) limit = Math.min(20, Math.max(5, Number(body.limit)))
      } catch {
        // use defaults
      }
    } else {
      const url = new URL(req.url)
      minCount = Math.max(1, parseInt(url.searchParams.get('min_count') ?? '3', 10))
      limit = Math.min(20, Math.max(5, parseInt(url.searchParams.get('limit') ?? '10', 10)))
    }

    const { data, error } = await supabaseClient.rpc('get_unmapped_raw_label_suggestions', {
      p_min_count: minCount,
      p_limit: limit,
    })

    if (error) throw error

    const suggestions = (data ?? []).map((row: { raw_label: string; event_count: number }) => ({
      rawLabel: row.raw_label,
      count: Number(row.event_count),
    }))

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('get-tag-suggestions error:', error)
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
