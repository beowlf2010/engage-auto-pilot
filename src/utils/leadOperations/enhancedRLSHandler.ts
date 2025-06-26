
import { supabase } from '@/integrations/supabase/client';

export interface RLSValidationResult {
  canInsert: boolean;
  userProfile: any;
  userRoles: string[];
  error?: string;
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
        error: 'User not authenticated or session invalid'
      };
    }

    console.log('🔍 [RLS VALIDATION] User authenticated:', user.id);

    // Initialize user for CSV if needed
    try {
      const { data: initResult, error: initError } = await supabase.rpc('initialize_user_for_csv', {
        p_user_id: user.id,
        p_email: user.email || '',
        p_first_name: user.user_metadata?.first_name || 'User',
        p_last_name: user.user_metadata?.last_name || 'Name'
      });

      if (initError) {
        console.error('⚠️ [RLS VALIDATION] Failed to initialize user:', initError);
      } else {
        console.log('✅ [RLS VALIDATION] User initialized:', initResult);
      }
    } catch (initError) {
      console.warn('⚠️ [RLS VALIDATION] User initialization warning:', initError);
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
        error: `Profile error: ${profileError.message}`
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
        error: `Roles error: ${rolesError.message}`
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
      error: hasRequiredRole ? undefined : 'User lacks required manager or admin role'
    };
  } catch (error) {
    console.error('💥 [RLS VALIDATION] Unexpected error:', error);
    return {
      canInsert: false,
      userProfile: null,
      userRoles: [],
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
};

export const testLeadInsertion = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🧪 [RLS TEST] Testing lead insertion permissions');
    
    // First validate RLS permissions
    const validation = await validateRLSPermissions();
    if (!validation.canInsert) {
      return { success: false, error: validation.error || 'RLS validation failed' };
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
      return { success: false, error: error.message };
    }

    // Clean up test lead
    if (data?.id) {
      await supabase.from('leads').delete().eq('id', data.id);
      console.log('🧹 [RLS TEST] Cleaned up test lead');
    }

    console.log('✅ [RLS TEST] Insert test successful');
    return { success: true };
  } catch (error) {
    console.error('💥 [RLS TEST] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown test error' 
    };
  }
};
