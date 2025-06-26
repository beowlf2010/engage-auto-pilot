
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

    // Check if user profile exists first
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Only initialize user if profile doesn't exist
    if (!existingProfile && profileCheckError?.code === 'PGRST116') {
      try {
        console.log('🔧 [RLS VALIDATION] Initializing user profile and role');
        const { data: initResult, error: initError } = await supabase.rpc('initialize_user_for_csv_clean', {
          p_user_id: user.id,
          p_email: user.email || '',
          p_first_name: user.user_metadata?.first_name || 'User',
          p_last_name: user.user_metadata?.last_name || 'Name'
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
    }

    // Get user profile (should exist now)
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

    // Check user roles directly from the user_roles table
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('❌ [RLS VALIDATION] Role check error:', rolesError);
      return {
        canInsert: false,
        userProfile: profile,
        userRoles: [],
        error: `Role check error: ${rolesError.message}`,
        debugInfo: { rolesError, profile, userId: user.id }
      };
    }

    const roleNames = userRoles?.map(r => r.role) || [];
    const hasRequiredRole = roleNames.includes('manager') || roleNames.includes('admin');

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
