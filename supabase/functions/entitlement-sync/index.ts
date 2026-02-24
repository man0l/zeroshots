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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { db: { schema: 'screenshot_organizer' } }
    )

    const body = await req.json()
    const { event, subscriber } = body

    // Log for debugging
    console.log('RevenueCat webhook received:', event)
    console.log('Subscriber:', subscriber)

    const userId = subscriber?.app_user_id
    if (!userId) {
      throw new Error('No app_user_id in subscriber')
    }

    // Get premium entitlement
    const premiumEntitlement = subscriber.entitlements?.premium
    const hasPremium = !!premiumEntitlement

    let entitlement: string
    let status: string
    let expiresAt: string | null = null

    if (event === 'INITIAL_PURCHASE' || event === 'RENEWAL' || event === 'UNCANCELLATION') {
      if (hasPremium) {
        // Check if it's lifetime (no expiration)
        if (!premiumEntitlement.expires_date) {
          entitlement = 'lifetime'
          status = 'active'
        } else {
          entitlement = 'premium'
          status = 'active'
          expiresAt = premiumEntitlement.expires_date
        }
      } else {
        entitlement = 'free'
        status = 'active'
      }
    } else if (event === 'CANCELLATION' || event === 'EXPIRATION' || event === 'BILLING_ISSUE') {
      entitlement = 'free'
      status = 'cancelled'
    } else if (event === 'PRODUCT_CHANGE') {
      // Handle product changes
      entitlement = hasPremium ? 'premium' : 'free'
      status = 'active'
      if (premiumEntitlement?.expires_date) {
        expiresAt = premiumEntitlement.expires_date
      }
    } else {
      // Unknown event, log and return
      console.log('Unknown event type:', event)
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upsert subscription record
    const { error } = await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: userId,
        provider: 'revenuecat',
        entitlement,
        status,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId,
        entitlement,
        status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
