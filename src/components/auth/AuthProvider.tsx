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

  // Initialize user for CSV operations using the completely clean function
  const initializeUserForCSV = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !session) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('🔧 [AUTH] Initializing user with completely clean function:', user.id);
      
      const { data, error } = await supabase.rpc('initialize_user_completely_clean', {
        p_user_id: user.id,
        p_email: user.email || '',
        p_first_name: user.user_metadata?.first_name || 'User',
        p_last_name: user.user_metadata?.last_name || 'Name'
      });

      if (error) {
        console.error('❌ [AUTH] Failed to initialize user with clean function:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [AUTH] User initialized with clean function:', data);
      
      // Refresh profile data
      await fetchUserProfile(user.id);
      
      return { success: true };
    } catch (error) {
      console.error('💥 [AUTH] Unexpected error during clean initialization:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Helper function to fetch user profile with clean RLS
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile with clean RLS:', error);
        return null;
      }
      
      // If no profile exists, initialize the user with clean function
      if (!profileData) {
        console.log('No profile found, initializing user with clean function');
        const initResult = await initializeUserForCSV();
        
        if (initResult.success) {
          // Try fetching profile again
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          return newProfile;
        }
        
        return null;
      }
      
      return profileData;
    } catch (error) {
      console.error('Error in fetchUserProfile with clean RLS:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('🔄 [AUTH] Auth state changed:', event, session?.user?.id);
        
        // Update session and user state
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle profile fetching after state update
        if (session?.user) {
          setTimeout(async () => {
            if (!mounted) return;
            
            try {
              const profileData = await fetchUserProfile(session.user.id);
              if (!mounted) return;
              
              setProfile(profileData);
              setLoading(false);
            } catch (error) {
              console.error('Error in deferred auth setup:', error);
              if (!mounted) return;
              setLoading(false);
            }
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
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
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        initializeUserForCSV,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
