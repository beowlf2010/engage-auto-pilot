
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile lookup error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify user role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestBody = await req.json()
    const { settingType, value } = requestBody

    if (!settingType || !value) {
      return new Response(
        JSON.stringify({ error: 'Missing settingType or value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Updating setting:', settingType, 'for user:', user.id)

    // Validate OpenAI API key format
    if (settingType === 'OPENAI_API_KEY') {
      if (!value.startsWith('sk-') || value.length < 50) {
        return new Response(
          JSON.stringify({ error: 'Invalid OpenAI API key format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate Telnyx API key format
    if (settingType === 'TELNYX_API_KEY') {
      if (!value.startsWith('KEY') || value.length < 30) {
        return new Response(
          JSON.stringify({ error: 'Invalid Telnyx API key format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate Telnyx Messaging Profile ID format (UUID)
    if (settingType === 'TELNYX_MESSAGING_PROFILE_ID') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(value)) {
        return new Response(
          JSON.stringify({ error: 'Invalid Telnyx Messaging Profile ID format (must be a UUID)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Store the setting in the database
    const { error: dbError } = await supabase
      .from('settings')
      .upsert({
        key: settingType,
        value: value,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to save setting to database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Setting ${settingType} saved successfully to database`)

    // Get a user-friendly name for the setting
    const settingNames = {
      'OPENAI_API_KEY': 'OpenAI API Key',
      'TELNYX_API_KEY': 'Telnyx API Key',
      'TELNYX_MESSAGING_PROFILE_ID': 'Telnyx Messaging Profile ID'
    }

    const friendlyName = settingNames[settingType] || settingType

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${friendlyName} updated successfully`,
        note: 'Settings have been saved and will take effect immediately for new requests.'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error updating settings:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
