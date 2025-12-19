import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { platform, profile } = await req.json()
    console.log('Triggering Expo build:', { platform, profile })

    // Get Expo access token from environment
    const expoAccessToken = Deno.env.get('Expo_Access_Token')
    
    if (!expoAccessToken) {
      throw new Error('Expo_Access_Token not configured in Supabase environment variables')
    }

    // EAS Build API endpoint
    const projectId = '6db23bce-9be7-4ac0-8f9c-3020328f2034'
    const buildUrl = `https://api.expo.dev/v2/projects/${projectId}/builds`

    // Trigger build via EAS API
    const buildResponse = await fetch(buildUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${expoAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: platform || 'all',
        profile: profile || 'development',
        metadata: {
          triggeredBy: 'supabase-function',
          timestamp: new Date().toISOString()
        }
      })
    })

    const buildData = await buildResponse.json()
    
    if (!buildResponse.ok) {
      console.error('EAS Build API Error:', buildData)
      throw new Error(`EAS Build failed: ${buildData.message || 'Unknown error'}`)
    }

    console.log('Build triggered successfully:', buildData)

    // Store build information in database
    const { error: dbError } = await supabaseClient
      .from('expo_builds')
      .insert({
        build_id: buildData.id,
        platform: platform,
        profile: profile,
        status: 'in-progress',
        triggered_at: new Date().toISOString(),
        build_url: `https://expo.dev/accounts/djpearson/projects/builddesk/builds/${buildData.id}`,
        metadata: buildData
      })

    if (dbError) {
      console.error('Database error:', dbError)
      // Don't fail the build trigger if DB insert fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        buildId: buildData.id,
        buildUrl: `https://expo.dev/accounts/djpearson/projects/builddesk/builds/${buildData.id}`,
        platform: platform,
        profile: profile,
        message: 'Build triggered successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const errorObj = error as Error;
    console.error('Expo build trigger error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorObj.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 