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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

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

    // Validate and format events
    const formattedEvents = events.map((event: any) => ({
      user_id: event.user_id || null,
      event_name: event.name,
      properties: event.properties || {},
      created_at: event.timestamp || new Date().toISOString(),
    }))

    // Batch insert events
    const { error } = await supabaseClient
      .from('analytics_events')
      .insert(formattedEvents)

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted: formattedEvents.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error ingesting events:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
