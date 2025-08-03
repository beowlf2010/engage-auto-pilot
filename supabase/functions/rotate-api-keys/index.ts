import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// API key rotation constants
const ROTATION_REASONS = ['scheduled', 'security_breach', 'manual_rotation', 'key_compromise']
const MAX_ROTATION_ATTEMPTS_PER_DAY = 3

interface RotationRequest {
  settingType: string
  newValue: string
  reason: string
  emergencyRotation?: boolean
}

// Enhanced security validation for rotation requests
function validateRotationRequest(request: RotationRequest): { valid: boolean; error?: string } {
  if (!request.settingType || !request.newValue || !request.reason) {
    return { valid: false, error: 'Missing required rotation parameters' }
  }
  
  if (!ROTATION_REASONS.includes(request.reason)) {
    return { valid: false, error: `Invalid rotation reason. Must be one of: ${ROTATION_REASONS.join(', ')}` }
  }
  
  // Enhanced validation for emergency rotations
  if (request.emergencyRotation && request.reason !== 'security_breach' && request.reason !== 'key_compromise') {
    return { valid: false, error: 'Emergency rotation only allowed for security breaches or key compromise' }
  }
  
  return { valid: true }
}

// Check rotation rate limits
async function checkRotationLimits(supabase: any, userId: string, settingType: string, isEmergency: boolean): Promise<{ allowed: boolean; reason?: string }> {
  if (isEmergency) {
    // Emergency rotations bypass rate limits but are logged heavily
    return { allowed: true }
  }
  
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  try {
    const { data: rotationHistory, error } = await supabase
      .from('security_audit_log')
      .select('count(*)')
      .eq('user_id', userId)
      .eq('action', 'api_key_rotated')
      .gte('created_at', oneDayAgo.toISOString())
    
    if (error) {
      console.error('Error checking rotation limits:', error)
      return { allowed: false, reason: 'Security check failed' }
    }
    
    const rotationCount = rotationHistory?.[0]?.count || 0
    if (rotationCount >= MAX_ROTATION_ATTEMPTS_PER_DAY) {
      return { 
        allowed: false, 
        reason: `Daily rotation limit reached (${rotationCount}/${MAX_ROTATION_ATTEMPTS_PER_DAY}). Contact support for emergency rotations.` 
      }
    }
    
    return { allowed: true }
    
  } catch (error) {
    console.error('Error in rotation security check:', error)
    return { allowed: false, reason: 'Security validation failed' }
  }
}

// Secure API key rotation with backup
async function rotateApiKey(supabase: any, userId: string, request: RotationRequest): Promise<{ success: boolean; error?: string; backupCreated?: boolean }> {
  const { settingType, newValue, reason, emergencyRotation } = request
  
  try {
    // Step 1: Get current value for backup
    const { data: currentSetting, error: fetchError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', settingType)
      .single()
    
    if (fetchError) {
      console.error('Failed to fetch current setting:', fetchError)
      return { success: false, error: 'Failed to backup current key' }
    }
    
    // Step 2: Create backup entry
    const backupData = {
      original_key: settingType,
      original_value: currentSetting.value,
      rotation_reason: reason,
      rotated_by: userId,
      emergency_rotation: emergencyRotation || false,
      backup_created_at: new Date().toISOString()
    }
    
    const { error: backupError } = await supabase
      .from('api_key_backups')
      .insert(backupData)
    
    if (backupError) {
      console.error('Failed to create backup:', backupError)
      return { success: false, error: 'Failed to create key backup' }
    }
    
    // Step 3: Update with new key value
    const { error: updateError } = await supabase
      .from('settings')
      .update({
        value: newValue,
        updated_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('key', settingType)
    
    if (updateError) {
      console.error('Failed to update setting:', updateError)
      return { success: false, error: 'Failed to update key value' }
    }
    
    // Step 4: Log the rotation event
    await supabase.rpc('log_security_event', {
      p_action: 'api_key_rotated',
      p_resource_type: 'api_keys',
      p_resource_id: settingType,
      p_details: {
        rotation_reason: reason,
        emergency_rotation: emergencyRotation || false,
        backup_created: true,
        rotated_by: userId,
        timestamp: new Date().toISOString()
      }
    })
    
    return { success: true, backupCreated: true }
    
  } catch (error) {
    console.error('Critical error during key rotation:', error)
    return { success: false, error: 'Key rotation failed due to system error' }
  }
}

Deno.serve(async (req) => {
  console.log('=== API KEY ROTATION FUNCTION START ===')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authentication check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced role verification
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (rolesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify user roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const hasAdminRole = userRoles && userRoles.some(role => role.role === 'admin')
    if (!hasAdminRole) {
      await supabase.rpc('log_security_event', {
        p_action: 'unauthorized_rotation_attempt',
        p_resource_type: 'api_keys',
        p_resource_id: user.id,
        p_details: {
          user_roles: userRoles?.map(r => r.role) || [],
          attempted_at: new Date().toISOString()
        }
      })
      
      return new Response(
        JSON.stringify({ error: 'Admin access required for key rotation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rotationRequest: RotationRequest = await req.json()
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    
    console.log('🔄 Processing rotation request:', {
      settingType: rotationRequest.settingType,
      reason: rotationRequest.reason,
      emergency: rotationRequest.emergencyRotation,
      clientIP
    })

    // Validate rotation request
    const validation = validateRotationRequest(rotationRequest)
    if (!validation.valid) {
      await supabase.rpc('log_security_event', {
        p_action: 'invalid_rotation_request',
        p_resource_type: 'api_keys',
        p_resource_id: user.id,
        p_details: {
          error: validation.error,
          request: rotationRequest,
          client_ip: clientIP
        }
      })
      
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rotation rate limits
    const limitCheck = await checkRotationLimits(
      supabase, 
      user.id, 
      rotationRequest.settingType, 
      rotationRequest.emergencyRotation || false
    )
    
    if (!limitCheck.allowed) {
      await supabase.rpc('log_security_event', {
        p_action: 'rotation_rate_limit_exceeded',
        p_resource_type: 'api_keys',
        p_resource_id: user.id,
        p_details: {
          reason: limitCheck.reason,
          setting_type: rotationRequest.settingType,
          client_ip: clientIP
        }
      })
      
      return new Response(
        JSON.stringify({ error: limitCheck.reason }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Perform the key rotation
    const rotationResult = await rotateApiKey(supabase, user.id, rotationRequest)
    
    if (!rotationResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: rotationResult.error 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `API key for ${rotationRequest.settingType} rotated successfully`,
        backupCreated: rotationResult.backupCreated,
        rotationId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 CRITICAL ERROR in rotate-api-keys function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error during key rotation',
        type: 'server_error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})