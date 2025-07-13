
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  initializeUserForCSV: () => Promise<{ success: boolean; error?: string }>;
  uploadInProgress: boolean;
  setUploadInProgress: (inProgress: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadInProgress, setUploadInProgress] = useState(false);

  // Initialize user for CSV operations using synchronized approach
  const initializeUserForCSV = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !session) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('🔧 [AUTH] Initializing user with synchronized approach:', user.id);
      
      // First ensure profile exists
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
        console.error('❌ [AUTH] Profile upsert failed:', profileError);
        return { success: false, error: `Profile creation failed: ${profileError.message}` };
      }

      // Use the new synchronization function to ensure both tables are in sync
      const { error: syncError } = await supabase.rpc('synchronize_user_roles', {
        p_user_id: user.id,
        p_role: 'manager'
      });

      if (syncError) {
        console.error('❌ [AUTH] Role synchronization failed:', syncError);
        return { success: false, error: `Role synchronization failed: ${syncError.message}` };
      }

      console.log('✅ [AUTH] User initialized and synchronized successfully');
      
      // Refresh profile data
      await fetchUserProfile(user.id);
      
      return { success: true };
    } catch (error) {
      console.error('💥 [AUTH] Unexpected error during initialization:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Helper function to determine highest role with better logging
  const determineHighestRole = (roles: string[], profileRole?: string): string => {
    console.log('🔍 [AUTH] Determining highest role from:', { roles, profileRole });
    
    const roleHierarchy = ['admin', 'manager', 'sales', 'user'];
    
    // First check user_roles table entries
    for (const role of roleHierarchy) {
      if (roles.includes(role)) {
        console.log('✅ [AUTH] Found role in user_roles:', role);
        return role;
      }
    }
    
    // Fall back to profile role if no user_roles entries
    if (profileRole && roleHierarchy.includes(profileRole)) {
      console.log('⚠️ [AUTH] Falling back to profile role:', profileRole);
      return profileRole;
    }
    
    console.log('🚨 [AUTH] No valid role found, defaulting to user');
    return 'user';
  };

  // Helper function to fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch profile data
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      // Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
      }

      // If no profile exists, initialize the user
      if (!profileData) {
        console.log('No profile found, initializing user');
        const initResult = await initializeUserForCSV();
        
        if (initResult.success) {
          // Try fetching profile again
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          // Refetch roles after initialization
          const { data: newUserRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);

           if (newProfile && newUserRoles) {
             const roles = newUserRoles.map(r => r.role);
             const highestRole = determineHighestRole(roles, newProfile.role);
             return { ...newProfile, role: highestRole, userRoles: roles };
           }
          
          return newProfile;
        }
        
        return null;
      }
      
      // Determine highest role and return enhanced profile
      if (userRoles) {
        const roles = userRoles.map(r => r.role);
        const highestRole = determineHighestRole(roles, profileData.role);
        const enhancedProfile = { ...profileData, role: highestRole, userRoles: roles };
        
        // STEP 3: Debug timing of profile loading
        console.log('🔍 [DEBUG STEP 3] Enhanced profile created:', {
          userId: enhancedProfile.id,
          finalRole: enhancedProfile.role,
          userRoles: enhancedProfile.userRoles,
          profileRole: profileData.role,
          timestamp: new Date().toISOString()
        });
        
        return enhancedProfile;
      }
      
      console.log('🔍 [DEBUG STEP 3] Basic profile returned (no user_roles):', {
        userId: profileData.id,
        profileRole: profileData.role,
        timestamp: new Date().toISOString()
      });
      
      return profileData;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    let authChangeDebounceTimer: NodeJS.Timeout | null = null;
    
    // Set up auth state listener with debouncing to prevent rapid state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('🔄 [AUTH] Auth state changed:', event, session?.user?.id);
        
        // Clear previous debounce timer
        if (authChangeDebounceTimer) {
          clearTimeout(authChangeDebounceTimer);
        }
        
        // Skip intensive auth operations if upload is in progress
        if (uploadInProgress && event === 'TOKEN_REFRESHED') {
          console.log('⏭️ [AUTH] Skipping profile refetch during upload - token refresh handled silently');
          setSession(session);
          setUser(session?.user ?? null);
          return;
        }
        
        // Update session and user state immediately
        setSession(session);
        setUser(session?.user ?? null);
        
        // Debounce profile fetching to prevent rapid consecutive calls
        authChangeDebounceTimer = setTimeout(async () => {
          if (!mounted) return;
          
          try {
            if (session?.user) {
              // Validate session before fetching profile
              if (session.expires_at && session.expires_at < Date.now() / 1000) {
                console.warn('⚠️ [AUTH] Session appears expired, skipping profile fetch');
                setLoading(false);
                return;
              }
              
              const profileData = await fetchUserProfile(session.user.id);
              if (!mounted) return;
              
              setProfile(profileData);
              setLoading(false);
            } else {
              setProfile(null);
              setLoading(false);
            }
          } catch (error) {
            console.error('Error in deferred auth setup:', error);
            if (!mounted) return;
            setLoading(false);
          }
        }, 300); // 300ms debounce delay
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id).then((profileData) => {
          if (!mounted) return;
          setProfile(profileData);
          setLoading(false);
        }).catch((error) => {
          console.error('Error in initial auth setup:', error);
          if (!mounted) return;
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Fallback timeout to prevent infinite loading
    const fallbackTimeout = setTimeout(() => {
      if (!mounted) return;
      console.warn('Auth loading timeout - setting loading to false');
      setLoading(false);
    }, 10000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(fallbackTimeout);
      if (authChangeDebounceTimer) {
        clearTimeout(authChangeDebounceTimer);
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // Log failed login attempt for security monitoring
        console.warn('🔒 [AUTH] Failed login attempt:', email);
        
        // Note: In a real app, you'd want to log this server-side to avoid client manipulation
        // For now, we'll just log it locally
        try {
          await supabase.rpc('log_failed_login_attempt', {
            p_email: email,
            p_ip_address: null, // Would need server-side implementation to get real IP
            p_user_agent: navigator.userAgent
          });
        } catch (logError) {
          console.error('Failed to log security event:', logError);
        }
      } else {
        console.log('✅ [AUTH] Successful login:', email);
      }
      
      return { error };
    } catch (error) {
      console.error('💥 [AUTH] Login error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Create a context value that includes upload state management
  const contextValue = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    initializeUserForCSV,
    uploadInProgress,
    setUploadInProgress,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
