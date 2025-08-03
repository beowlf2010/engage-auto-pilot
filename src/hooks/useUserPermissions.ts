import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export interface UserPermissions {
  roles: string[];
  isAdmin: boolean;
  isManager: boolean;
  isSales: boolean;
  canManageUsers: boolean;
  canManageLeads: boolean;
  canViewReports: boolean;
  loading: boolean;
  error: string | null;
}

export const useUserPermissions = (): UserPermissions => {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>({
    roles: [],
    isAdmin: false,
    isManager: false,
    isSales: false,
    canManageUsers: false,
    canManageLeads: false,
    canViewReports: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!profile?.id) {
        setPermissions(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        console.log('🔍 [PERMISSIONS] Fetching roles for user:', profile.id);
        
        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id);

        if (error) {
          console.error('❌ [PERMISSIONS] Error fetching roles:', error);
          setPermissions(prev => ({
            ...prev,
            loading: false,
            error: error.message
          }));
          return;
        }

        const roles = userRoles?.map(r => r.role) || [];
        const isAdmin = roles.includes('admin');
        const isManager = roles.includes('manager');
        const isSales = roles.includes('sales');

        console.log('✅ [PERMISSIONS] User roles loaded:', { roles, isAdmin, isManager, isSales });

        setPermissions({
          roles,
          isAdmin,
          isManager,
          isSales,
          canManageUsers: isAdmin || isManager,
          canManageLeads: isAdmin || isManager || isSales,
          canViewReports: isAdmin || isManager,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('💥 [PERMISSIONS] Unexpected error:', err);
        setPermissions(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }));
      }
    };

    fetchUserRoles();
  }, [profile?.id]);

  return permissions;
};

// Utility function to check specific permissions
export const checkPermission = (permissions: UserPermissions, action: string): boolean => {
  switch (action) {
    case 'manage_users':
      return permissions.canManageUsers;
    case 'manage_leads':
      return permissions.canManageLeads;
    case 'view_reports':
      return permissions.canViewReports;
    case 'admin_access':
      return permissions.isAdmin;
    default:
      return false;
  }
};