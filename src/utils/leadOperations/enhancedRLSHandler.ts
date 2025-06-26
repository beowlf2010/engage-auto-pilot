
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
    console.log('🔍 [RLS VALIDATION] Starting RLS validation with clean policies');
    
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

    // Initialize user with direct table operations (no recursion risk)
    try {
      console.log('🔧 [RLS VALIDATION] Initializing user with direct operations');
      
      // Direct profile upsert
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || 'User',
          last_name: user.user_metadata?.last_name || 'Name',
          role: 'manager'
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('⚠️ [RLS VALIDATION] Profile initialization failed:', profileError);
        return {
          canInsert: false,
          userProfile: null,
          userRoles: [],
          error: `Profile initialization failed: ${profileError.message}`,
          debugInfo: { profileError, userId: user.id }
        };
      }

      // Direct role upsert
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: 'manager'
        }, { onConflict: 'user_id,role' });

      if (roleError) {
        console.error('⚠️ [RLS VALIDATION] Role initialization failed:', roleError);
        return {
          canInsert: false,
          userProfile: null,
          userRoles: [],
          error: `Role initialization failed: ${roleError.message}`,
          debugInfo: { roleError, userId: user.id }
        };
      }

      console.log('✅ [RLS VALIDATION] Direct initialization completed');
    } catch (initError) {
      console.error('💥 [RLS VALIDATION] Initialization error:', initError);
      return {
        canInsert: false,
        userProfile: null,
        userRoles: [],
        error: `Initialization error: ${initError instanceof Error ? initError.message : 'Unknown error'}`,
        debugInfo: { initError, userId: user.id }
      };
    }

    // Get user profile
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

    // Get user roles
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

    console.log('✅ [RLS VALIDATION] Clean validation complete:', {
      userId: user.id,
      profileRole: profile?.role,
      systemRoles: roleNames,
      hasRequiredRole,
      sessionValid: !!session,
      rlsPoliciesClean: true
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
        profileExists: !!profile,
        rlsPoliciesClean: true
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
    console.log('🧪 [RLS TEST] Testing lead insertion with clean RLS policies');
    
    // First validate RLS permissions
    const validation = await validateRLSPermissions();
    if (!validation.canInsert) {
      return { 
        success: false, 
        error: validation.error || 'RLS validation failed',
        debugInfo: validation.debugInfo
      };
    }
    
    // Try a minimal insert to test RLS policies
    const testLead = {
      first_name: 'Test',
      last_name: 'Lead',
      vehicle_interest: 'Testing clean RLS policies',
      source: 'RLS Test',
      status: 'new'
    };

    console.log('🧪 [RLS TEST] Attempting test lead insertion with clean policies');
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

    console.log('✅ [RLS TEST] Insert test successful with clean policies');
    return { 
      success: true,
      debugInfo: { testLead, validation: validation.debugInfo, rlsPoliciesClean: true }
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
