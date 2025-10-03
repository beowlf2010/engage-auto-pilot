
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Security constants
const MAX_API_KEY_OPERATIONS_PER_HOUR = 10
const MAX_API_KEY_OPERATIONS_PER_DAY = 50
const SUSPICIOUS_ACTIVITY_THRESHOLD = 3

// Enhanced API key validation with security checks
function validateApiKeyFormat(settingType: string, value: string): { valid: boolean; error?: string; securityScore: number } {
  let securityScore = 0
  
  switch (settingType) {
    case 'OPENAI_API_KEY':
      if (!value.startsWith('sk-')) {
        return { valid: false, error: 'OpenAI API key must start with sk-', securityScore: 0 }
      }
      if (value.length < 50) {
        return { valid: false, error: 'OpenAI API key appears to be invalid length', securityScore: 0 }
      }
      securityScore = value.length > 60 ? 100 : 80
      break
      
    case 'TELNYX_API_KEY':
      if (!value.startsWith('KEY')) {
        return { valid: false, error: 'Telnyx API key must start with KEY', securityScore: 0 }
      }
      if (value.length < 30) {
        return { valid: false, error: 'Telnyx API key appears to be invalid length', securityScore: 0 }
      }
      securityScore = 90
      break
      
    case 'TWILIO_ACCOUNT_SID':
      if (!value.startsWith('AC')) {
        return { valid: false, error: 'Twilio Account SID must start with AC', securityScore: 0 }
      }
      if (value.length !== 34) {
        return { valid: false, error: 'Twilio Account SID must be exactly 34 characters', securityScore: 0 }
      }
      securityScore = 95
      break
      
    case 'TWILIO_AUTH_TOKEN':
      if (value.length !== 32) {
        return { valid: false, error: 'Twilio Auth Token must be exactly 32 characters', securityScore: 0 }
      }
      // Check for suspicious patterns
      if (value.includes('test') || value.includes('demo') || value.includes('sample')) {
        securityScore = 30
      } else {
        securityScore = 95
      }
      break
      
    case 'TWILIO_PHONE_NUMBER':
      const phoneRegex = /^\+1[0-9]{10}$/
      if (!phoneRegex.test(value)) {
        return { valid: false, error: 'Twilio Phone Number must be in E.164 format: +1XXXXXXXXXX', securityScore: 0 }
      }
      securityScore = 90
      break
      
    case 'TELNYX_MESSAGING_PROFILE_ID':
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(value)) {
        return { valid: false, error: 'Telnyx Messaging Profile ID must be a valid UUID', securityScore: 0 }
      }
      securityScore = 85
      break
      
    default:
      return { valid: false, error: 'Unknown setting type', securityScore: 0 }
  }
  
  return { valid: true, securityScore }
}

// Check for rate limiting and suspicious activity
async function checkSecurityLimits(supabase: any, userId: string, clientIP?: string): Promise<{ allowed: boolean; reason?: string }> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  try {
    // Check hourly rate limit
    const { data: hourlyRequests, error: hourlyError, count: hourlyCount } = await supabase
      .from('security_rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('operation_type', 'api_key_update')
      .gte('created_at', oneHourAgo.toISOString())
    
    if (hourlyError) {
      console.error('Error checking hourly rate limit:', hourlyError)
      return { allowed: false, reason: 'Security check failed' }
    }
    
    const actualHourlyCount = hourlyCount || 0
    if (actualHourlyCount >= MAX_API_KEY_OPERATIONS_PER_HOUR) {
      console.warn(`Rate limit exceeded for user ${userId}: ${actualHourlyCount} operations in past hour`)
      return { allowed: false, reason: 'Too many API key operations in the past hour. Please wait before trying again.' }
    }
    
    // Check daily rate limit
    const { data: dailyRequests, error: dailyError, count: dailyCount } = await supabase
      .from('security_rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('operation_type', 'api_key_update')
      .gte('created_at', oneDayAgo.toISOString())
    
    if (dailyError) {
      console.error('Error checking daily rate limit:', dailyError)
      return { allowed: false, reason: 'Security check failed' }
    }
    
    const actualDailyCount = dailyCount || 0
    if (actualDailyCount >= MAX_API_KEY_OPERATIONS_PER_DAY) {
      console.warn(`Daily rate limit exceeded for user ${userId}: ${actualDailyCount} operations today`)
      return { allowed: false, reason: 'Daily API key operation limit reached. Please try again tomorrow.' }
    }
    
    // Check for suspicious activity patterns
    if (actualHourlyCount >= SUSPICIOUS_ACTIVITY_THRESHOLD) {
      console.warn(`Suspicious activity detected for user ${userId}: ${actualHourlyCount} operations in past hour`)
      // Log but don't block - just increase monitoring
      await logSecurityEvent(supabase, userId, 'suspicious_api_key_activity', {
        hourly_count: actualHourlyCount,
        daily_count: actualDailyCount,
        client_ip: clientIP
      })
    }
    
    return { allowed: true }
    
  } catch (error) {
    console.error('Error in security check:', error)
    return { allowed: false, reason: 'Security validation failed' }
  }
}

// Enhanced security event logging
async function logSecurityEvent(supabase: any, userId: string, eventType: string, details: any) {
  try {
    await supabase.rpc('log_security_event', {
      p_action: eventType,
      p_resource_type: 'api_keys',
      p_resource_id: userId,
      p_details: {
        ...details,
        timestamp: new Date().toISOString(),
        function: 'update-settings'
      }
    })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
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
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    
    console.log('📝 Updating setting:', settingType, 'Value length:', value?.length, 'Client IP:', clientIP);

    if (!settingType || !value) {
      await logSecurityEvent(supabase, user.id, 'invalid_api_key_request', {
        reason: 'Missing settingType or value',
        client_ip: clientIP
      })
      return new Response(
        JSON.stringify({ error: 'Missing settingType or value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced security checks
    console.log('🔒 Performing security validation...');
    
    // Check rate limits and suspicious activity
    const securityCheck = await checkSecurityLimits(supabase, user.id, clientIP)
    if (!securityCheck.allowed) {
      await logSecurityEvent(supabase, user.id, 'rate_limit_exceeded', {
        reason: securityCheck.reason,
        client_ip: clientIP,
        setting_type: settingType
      })
      return new Response(
        JSON.stringify({ error: securityCheck.reason }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Enhanced API key format validation
    const validation = validateApiKeyFormat(settingType, value)
    if (!validation.valid) {
      await logSecurityEvent(supabase, user.id, 'invalid_api_key_format', {
        setting_type: settingType,
        error: validation.error,
        security_score: validation.securityScore,
        client_ip: clientIP
      })
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Log successful validation with security score
    await logSecurityEvent(supabase, user.id, 'api_key_validation_success', {
      setting_type: settingType,
      security_score: validation.securityScore,
      client_ip: clientIP
    })
    
    // Record the rate limit entry
    try {
      await supabase.from('security_rate_limits').insert({
        user_id: user.id,
        operation_type: 'api_key_update',
        client_ip: clientIP,
        metadata: {
          setting_type: settingType,
          security_score: validation.securityScore
        }
      })
    } catch (rateLimitError) {
      console.error('Failed to record rate limit entry:', rateLimitError)
      // Don't fail the operation, just log the error
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
      'TELNYX_MESSAGING_PROFILE_ID': 'Telnyx Messaging Profile ID',
      'TWILIO_ACCOUNT_SID': 'Twilio Account SID',
      'TWILIO_AUTH_TOKEN': 'Twilio Auth Token',
      'TWILIO_PHONE_NUMBER': 'Twilio Phone Number'
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
