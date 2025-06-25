
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
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        canInsert: false,
        userProfile: null,
        userRoles: [],
        error: 'User not authenticated'
      };
    }

    // Check user profile using the new security definer function
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ [RLS VALIDATION] Profile error:', profileError);
      return {
        canInsert: false,
        userProfile: null,
        userRoles: [],
        error: `Profile error: ${profileError.message}`
      };
    }

    // Check user roles using the new security definer function
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
      hasRequiredRole
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
    console.log('🧪 [RLS TEST] Testing lead insertion permissions with new policies');
    
    // Try a minimal insert to test RLS with the new non-recursive policies
    const testLead = {
      first_name: 'Test',
      last_name: 'Lead',
      vehicle_interest: 'Testing new RLS policies',
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

    console.log('✅ [RLS TEST] Insert test successful with new policies');
    return { success: true };
  } catch (error) {
    console.error('💥 [RLS TEST] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown test error' 
    };
  }
};
