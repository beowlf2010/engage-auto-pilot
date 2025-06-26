
import { supabase } from '@/integrations/supabase/client';

export interface RLSValidationResult {
  canInsert: boolean;
  userProfile: any;
  userRoles: string[];
  error?: string;
  debugInfo?: any;
}

export const validateRLSPermissions = async (): Promise<RLSValidationResult> => {
  try {
    console.log('🔍 [RLS VALIDATION] Checking user permissions for lead insertion');
    
    // Get current user with session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (userError || !user || sessionError || !session) {
      return {
        canInsert: false,
        userProfile: null,
        userRoles: [],
        error: 'User not authenticated or session invalid',
        debugInfo: { userError, sessionError, hasUser: !!user, hasSession: !!session }
      };
    }

    console.log('🔍 [RLS VALIDATION] User authenticated:', user.id);

    // Initialize user using simplified function to avoid recursion
    try {
      const { data: initResult, error: initError } = await supabase.rpc('initialize_user_for_csv_simple', {
        p_user_id: user.id,
        p_email: user.email || ''
      });

      if (initError) {
        console.error('⚠️ [RLS VALIDATION] Failed to initialize user:', initError);
        return {
          canInsert: false,
          userProfile: null,
          userRoles: [],
          error: `User initialization failed: ${initError.message}`,
          debugInfo: { initError, userId: user.id }
        };
      } else {
        console.log('✅ [RLS VALIDATION] User initialized:', initResult);
      }
    } catch (initError) {
      console.error('💥 [RLS VALIDATION] User initialization error:', initError);
      return {
        canInsert: false,
        userProfile: null,
        userRoles: [],
        error: `User initialization error: ${initError instanceof Error ? initError.message : 'Unknown error'}`,
        debugInfo: { initError, userId: user.id }
      };
    }

    // Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ [RLS VALIDATION] Profile error:', profileError);
      return {
        canInsert: false,
        userProfile: null,
        userRoles: [],
        error: `Profile error: ${profileError.message}`,
        debugInfo: { profileError, userId: user.id }
      };
    }

    // Check user roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('❌ [RLS VALIDATION] Roles error:', rolesError);
      return {
        canInsert: false,
        userProfile: profile,
        userRoles: [],
        error: `Roles error: ${rolesError.message}`,
        debugInfo: { rolesError, profile, userId: user.id }
      };
    }

    const roleNames = roles?.map(r => r.role) || [];
    const hasRequiredRole = roleNames.some(role => ['admin', 'manager'].includes(role));

    console.log('✅ [RLS VALIDATION] Validation complete:', {
      userId: user.id,
      profileRole: profile?.role,
      systemRoles: roleNames,
      hasRequiredRole,
      sessionValid: !!session
    });

    return {
      canInsert: hasRequiredRole,
      userProfile: profile,
      userRoles: roleNames,
      error: hasRequiredRole ? undefined : 'User lacks required manager or admin role',
      debugInfo: {
        userId: user.id,
        profileRole: profile?.role,
        systemRoles: roleNames,
        hasRequiredRole,
        sessionValid: !!session,
        profileExists: !!profile
      }
    };
  } catch (error) {
    console.error('💥 [RLS VALIDATION] Unexpected error:', error);
    return {
      canInsert: false,
      userProfile: null,
      userRoles: [],
      error: error instanceof Error ? error.message : 'Unknown validation error',
      debugInfo: { unexpectedError: error }
    };
  }
};

export const testLeadInsertion = async (): Promise<{ success: boolean; error?: string; debugInfo?: any }> => {
  try {
    console.log('🧪 [RLS TEST] Testing lead insertion permissions');
    
    // First validate RLS permissions
    const validation = await validateRLSPermissions();
    if (!validation.canInsert) {
      return { 
        success: false, 
        error: validation.error || 'RLS validation failed',
        debugInfo: validation.debugInfo
      };
    }
    
    // Try a minimal insert to test RLS
    const testLead = {
      first_name: 'Test',
      last_name: 'Lead',
      vehicle_interest: 'Testing RLS permissions',
      source: 'RLS Test',
      status: 'new'
    };

    const { data, error } = await supabase
      .from('leads')
      .insert(testLead)
      .select('id')
      .single();

    if (error) {
      console.error('❌ [RLS TEST] Insert failed:', error);
      return { 
        success: false, 
        error: error.message,
        debugInfo: { testLead, insertError: error, validation: validation.debugInfo }
      };
    }

    // Clean up test lead
    if (data?.id) {
      await supabase.from('leads').delete().eq('id', data.id);
      console.log('🧹 [RLS TEST] Cleaned up test lead');
    }

    console.log('✅ [RLS TEST] Insert test successful');
    return { 
      success: true,
      debugInfo: { testLead, validation: validation.debugInfo }
    };
  } catch (error) {
    console.error('💥 [RLS TEST] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown test error',
      debugInfo: { unexpectedError: error }
    };
  }
};
