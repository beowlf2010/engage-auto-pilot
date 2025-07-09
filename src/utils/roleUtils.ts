import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'manager' | 'sales' | 'user';

/**
 * Synchronizes user roles between profiles.role and user_roles table
 * Uses the database function for atomic updates
 */
export const synchronizeUserRole = async (userId: string, role: AppRole): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔄 [ROLE] Synchronizing role:', { userId, role });
    
    const { error } = await supabase.rpc('synchronize_user_roles', {
      p_user_id: userId,
      p_role: role
    });

    if (error) {
      console.error('❌ [ROLE] Role synchronization failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [ROLE] Role synchronized successfully');
    return { success: true };
  } catch (error) {
    console.error('💥 [ROLE] Unexpected error during role synchronization:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Checks if a user has a specific role
 */
export const hasRole = async (userId: string, role: AppRole): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', role)
      .single();

    return !!data;
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};

/**
 * Gets all roles for a user
 */
export const getUserRoles = async (userId: string): Promise<AppRole[]> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    return data?.map(r => r.role as AppRole) || [];
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }
};

/**
 * Determines the highest role from a list of roles
 */
export const determineHighestRole = (roles: string[], fallbackRole?: string): AppRole => {
  const roleHierarchy: AppRole[] = ['admin', 'manager', 'sales', 'user'];
  
  // First check the provided roles
  for (const role of roleHierarchy) {
    if (roles.includes(role)) {
      return role;
    }
  }
  
  // Fall back to the fallback role if it's valid
  if (fallbackRole && roleHierarchy.includes(fallbackRole as AppRole)) {
    return fallbackRole as AppRole;
  }
  
  return 'user';
};