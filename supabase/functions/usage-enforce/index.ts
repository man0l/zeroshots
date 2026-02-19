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

    const { user_id, count = 1 } = await req.json()

    // Get current counter
    const { data: counter, error: fetchError } = await supabaseClient
      .from('usage_counters')
      .select('*')
      .eq('user_id', user_id)
      .gte('period_end', new Date().toISOString())
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    let remaining: number

    if (!counter) {
      // Create new counter for this period
      const periodStart = new Date()
      const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000) // 24 hours

      const { error: insertError } = await supabaseClient
        .from('usage_counters')
        .insert({
          user_id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          deletes_used: count,
          trust_limit: 15,
        })

      if (insertError) throw insertError
      remaining = 15 - count
    } else {
      // Update existing counter
      const newCount = counter.deletes_used + count
      remaining = counter.trust_limit - newCount

      const { error: updateError } = await supabaseClient
        .from('usage_counters')
        .update({ deletes_used: newCount })
        .eq('id', counter.id)

      if (updateError) throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        can_delete: remaining > 0,
        remaining: Math.max(0, remaining),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
