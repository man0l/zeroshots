import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCHEMA = 'screenshot_organizer'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Call PostgREST directly to bypass Kong (which strips credentials). Service role for inserts.
    const restUrl = (Deno.env.get('SUPABASE_INTERNAL_REST_URL') ?? Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')
    // Prefer keys that are actual JWTs; SUPABASE_SERVICE_ROLE_KEY may be literal ${SERVICE_ROLE_KEY} if compose substitution failed
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!restUrl || !serviceKey) {
      throw new Error('SUPABASE_INTERNAL_REST_URL and service role key required')
    }

    const { events } = await req.json()

    if (!Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Events array required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const formattedEvents = events.map((event: any) => ({
      user_id: event.user_id || null,
      event_name: event.event_name ?? event.name,
      properties: event.properties || {},
      created_at: event.timestamp || new Date().toISOString(),
    }))

    const res = await fetch(`${restUrl}/analytics_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Profile': SCHEMA,
        'Accept-Profile': SCHEMA,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(formattedEvents),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `PostgREST ${res.status}`)
    }

    return new Response(
      JSON.stringify({ success: true, inserted: formattedEvents.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error ingesting events:', error)
    return new Response(
      JSON.stringify({ error: msg || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
