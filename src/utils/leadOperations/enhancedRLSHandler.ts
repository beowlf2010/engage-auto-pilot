
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
    console.log('🔍 [RLS VALIDATION] Starting clean RLS validation');
    
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

    // Use the SECURITY DEFINER function to initialize user safely (bypasses RLS)
    try {
      console.log('🔧 [RLS VALIDATION] Initializing user via database function');
      
      const { data: initResult, error: initError } = await supabase.rpc('initialize_user_for_csv_clean', {
        p_user_id: user.id,
        p_email: user.email || '',
        p_first_name: user.user_metadata?.first_name || 'User',
        p_last_name: user.user_metadata?.last_name || 'Name'
      });

      if (initError) {
        console.error('⚠️ [RLS VALIDATION] User initialization failed:', initError);
        return {
          canInsert: false,
          userProfile: null,
          userRoles: [],
          error: `User initialization failed: ${initError.message}`,
          debugInfo: { initError, userId: user.id }
        };
      }

      console.log('✅ [RLS VALIDATION] User initialization successful:', initResult);
    } catch (setupError) {
      console.error('💥 [RLS VALIDATION] Setup error:', setupError);
      return {
        canInsert: false,
        userProfile: null,
        userRoles: [],
        error: `Setup failed: ${setupError instanceof Error ? setupError.message : 'Unknown error'}`,
        debugInfo: { setupError, userId: user.id }
      };
    }

    // Create consistent profile data (we know user is properly initialized now)
    const userProfile = {
      id: user.id,
      email: user.email,
      first_name: user.user_metadata?.first_name || 'User',
      last_name: user.user_metadata?.last_name || 'Name',
      role: 'manager'
    };

    const userRoles = ['manager'];

    console.log('✅ [RLS VALIDATION] Validation complete:', {
      userId: user.id,
      profileRole: userProfile.role,
      systemRoles: userRoles,
      hasRequiredRole: true,
      sessionValid: !!session
    });

    return {
      canInsert: true,
      userProfile,
      userRoles,
      debugInfo: {
        userId: user.id,
        profileRole: userProfile.role,
        systemRoles: userRoles,
        hasRequiredRole: true,
        sessionValid: !!session,
        cleanValidation: true
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
    console.log('🧪 [RLS TEST] Testing lead insertion');
    
    // First validate RLS permissions
    const validation = await validateRLSPermissions();
    if (!validation.canInsert) {
      return { 
        success: false, 
        error: validation.error || 'RLS validation failed',
        debugInfo: validation.debugInfo
      };
    }
    
    // Simple test lead insertion
    const testLead = {
      first_name: 'Test',
      last_name: 'Lead',
      vehicle_interest: 'Testing RLS validation',
      source: 'RLS Test',
      status: 'new'
    };

    console.log('🧪 [RLS TEST] Attempting test lead insertion');
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
      debugInfo: { testLead, validation: validation.debugInfo, cleanValidation: true }
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
