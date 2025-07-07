
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('=== UPDATE SETTINGS FUNCTION START ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Getting auth header...');
    // Get the user from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Verifying user authentication...');
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✓ User authenticated:', user.id);

    console.log('Checking admin role...');
    // Check if user has admin role in user_roles table
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (rolesError) {
      console.error('❌ User roles lookup error:', rolesError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify user roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has admin role
    const hasAdminRole = userRoles && userRoles.some(role => role.role === 'admin');
    if (!hasAdminRole) {
      const roles = userRoles ? userRoles.map(r => r.role).join(', ') : 'none';
      console.log('❌ User is not admin. Roles:', roles);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✓ Admin check passed.');

    const requestBody = await req.json()
    const { settingType, value } = requestBody
    console.log('📝 Updating setting:', settingType, 'Value length:', value?.length);

    if (!settingType || !value) {
      return new Response(
        JSON.stringify({ error: 'Missing settingType or value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    console.log('🔄 Attempting to update/insert setting...');
    
    // First try to update existing record
    const { data: updateData, error: updateError } = await supabase
      .from('settings')
      .update({
        value: value,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('key', settingType)
      .select()

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update setting in database', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If no rows were updated (setting doesn't exist), insert it
    if (!updateData || updateData.length === 0) {
      console.log('📝 Setting does not exist, inserting new record...');
      const { error: insertError } = await supabase
        .from('settings')
        .insert({
          key: settingType,
          value: value,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to insert setting in database', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('✅ Setting inserted successfully');
    } else {
      console.log('✅ Setting updated successfully');
    }

    // Get a user-friendly name for the setting
    const settingNames = {
      'OPENAI_API_KEY': 'OpenAI API Key',
      'TELNYX_API_KEY': 'Telnyx API Key',
      'TELNYX_MESSAGING_PROFILE_ID': 'Telnyx Messaging Profile ID'
    }

    const friendlyName = settingNames[settingType] || settingType

    console.log('✅ SUCCESS! Setting saved:', friendlyName);

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
    console.error('💥 CRITICAL ERROR in update-settings function:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Server error: ${error.message}`,
        type: 'server_error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
