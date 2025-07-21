
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'sales' | 'user';
  created_at: string;
}

export const useEnhancedUserProfile = () => {
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureUserProfile = async () => {
    if (!user) {
      setError('No authenticated user found');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 [USER PROFILE] Checking user profile for:', user.id);
      
      // Use the profile from auth context if available
      if (authProfile) {
        const userProfileData: UserProfile = {
          ...authProfile,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setUserProfile(userProfileData);
      } else {
        // Create fallback profile from user metadata
        const fallbackProfile: UserProfile = {
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || 'User',
          last_name: user.user_metadata?.last_name || 'Name',
          role: 'manager',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setUserProfile(fallbackProfile);
        console.log('⚠️ [USER PROFILE] Using fallback profile');
      }

      // Check user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (rolesError) {
        console.warn('⚠️ [USER PROFILE] Roles fetch error:', rolesError);
        // Continue without roles rather than failing
        setUserRoles([]);
      } else {
        setUserRoles(roles || []);

        // Ensure user has at least manager role for CSV uploads
        const hasManagerOrAdmin = roles?.some(r => ['manager', 'admin'].includes(r.role));
        
        if (!hasManagerOrAdmin) {
          console.log('📝 [USER PROFILE] Adding manager role for CSV upload capabilities');
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: user.id,
              role: 'manager'
            });

          if (roleError && !roleError.message.includes('duplicate')) {
            console.warn('⚠️ [USER PROFILE] Role insertion failed:', roleError);
          } else {
            // Refetch roles
            const { data: updatedRoles } = await supabase
              .from('user_roles')
              .select('*')
              .eq('user_id', user.id);

            setUserRoles(updatedRoles || []);
            console.log('✅ [USER PROFILE] Added manager role successfully');
          }
        }
      }

      setError(null);
    } catch (err) {
      console.error('❌ [USER PROFILE] Error ensuring user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to setup user profile');
      
      // Still provide a basic profile rather than failing completely
      if (user) {
        const basicProfile: UserProfile = {
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || 'User',
          last_name: user.user_metadata?.last_name || 'Name',
          role: 'manager',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setUserProfile(basicProfile);
        console.log('⚠️ [USER PROFILE] Using basic fallback profile due to error');
      }
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: 'admin' | 'manager' | 'sales' | 'user'): boolean => {
    return userRoles.some(r => r.role === role);
  };

  const hasAnyRole = (roles: ('admin' | 'manager' | 'sales' | 'user')[]): boolean => {
    return userRoles.some(r => roles.includes(r.role));
  };

  const canUploadCSV = (): boolean => {
    return hasAnyRole(['admin', 'manager']);
  };

  useEffect(() => {
    if (!authLoading && user) {
      ensureUserProfile();
    } else if (!authLoading && !user) {
      setLoading(false);
      setError('User not authenticated');
    }
  }, [user, authLoading, authProfile]);

  return {
    userProfile: userProfile || authProfile,
    userRoles,
    loading,
    error,
    hasRole,
    hasAnyRole,
    canUploadCSV,
    ensureUserProfile
  };
};
