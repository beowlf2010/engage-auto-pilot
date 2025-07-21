
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const createFallbackProfile = (user: User): Profile => {
    return {
      id: user.id,
      email: user.email || '',
      first_name: user.user_metadata?.first_name || 'User',
      last_name: user.user_metadata?.last_name || 'Name',
      role: 'manager'
    };
  };

  const fetchProfile = async (userId: string, retryCount = 0): Promise<Profile | null> => {
    try {
      console.log('🔍 [AUTH PROVIDER] Fetching profile for user:', userId);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ [AUTH PROVIDER] Profile fetch error:', error);
        
        // Retry once on error
        if (retryCount < 1) {
          console.log('🔄 [AUTH PROVIDER] Retrying profile fetch...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(userId, retryCount + 1);
        }
        
        return null;
      }

      console.log('✅ [AUTH PROVIDER] Profile loaded:', profileData);
      return profileData;
    } catch (err) {
      console.error('❌ [AUTH PROVIDER] Profile fetch exception:', err);
      return null;
    }
  };

  useEffect(() => {
    console.log('🔐 [AUTH PROVIDER] Initializing auth state...');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 [AUTH PROVIDER] Auth state changed:', event, !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Try to fetch profile, but don't block on it
          const fetchedProfile = await fetchProfile(session.user.id);
          
          if (fetchedProfile) {
            setProfile(fetchedProfile);
          } else {
            // Create fallback profile if database fetch fails
            console.log('⚠️ [AUTH PROVIDER] Using fallback profile');
            const fallbackProfile = createFallbackProfile(session.user);
            setProfile(fallbackProfile);
          }
        } else {
          console.log('🚫 [AUTH PROVIDER] No session, clearing profile');
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        console.log('🔍 [AUTH PROVIDER] Checking for existing session...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 [AUTH PROVIDER] Initial session check:', !!session);
        // The onAuthStateChange handler will process this session
      } catch (error) {
        console.error('❌ [AUTH PROVIDER] Session initialization failed:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      console.log('🔌 [AUTH PROVIDER] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔑 [AUTH PROVIDER] Signing in user...');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (err) {
      console.error('❌ [AUTH PROVIDER] Sign in exception:', err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    console.log('📝 [AUTH PROVIDER] Signing up user...');
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      return { error };
    } catch (err) {
      console.error('❌ [AUTH PROVIDER] Sign up exception:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    console.log('🚪 [AUTH PROVIDER] Signing out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ [AUTH PROVIDER] Sign out error:', error);
      } else {
        console.log('✅ [AUTH PROVIDER] Signed out successfully');
      }
    } catch (err) {
      console.error('❌ [AUTH PROVIDER] Sign out exception:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, signIn, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};
