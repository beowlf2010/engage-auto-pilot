
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

  useEffect(() => {
    console.log('🔐 [AUTH PROVIDER] Initializing auth state...');

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 [AUTH PROVIDER] Auth state changed:', event, !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 [AUTH PROVIDER] Loading profile for user:', session.user.id);
          try {
            const { data: profileData, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (error) {
              console.error('❌ [AUTH PROVIDER] Profile fetch error:', error);
              setProfile(null);
            } else {
              console.log('✅ [AUTH PROVIDER] Profile loaded:', profileData);
              setProfile(profileData);
            }
          } catch (err) {
            console.error('❌ [AUTH PROVIDER] Profile fetch exception:', err);
            setProfile(null);
          }
        } else {
          console.log('🚫 [AUTH PROVIDER] No session, clearing profile');
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session with improved timeout handling
    const initializeAuth = async () => {
      try {
        console.log('🔍 [AUTH PROVIDER] Checking for existing session...');
        
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 10000)
        );
        
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (error) {
          console.error('❌ [AUTH PROVIDER] Session fetch error:', error);
        } else {
          console.log('🔍 [AUTH PROVIDER] Initial session check:', !!session);
          // The onAuthStateChange handler will handle the session processing
        }
      } catch (error) {
        console.error('❌ [AUTH PROVIDER] Session initialization failed:', error);
        // Continue without session - user can still log in
      } finally {
        // Ensure loading is false even if session fetch fails
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      }
    };

    initializeAuth();

    return () => {
      console.log('🔌 [AUTH PROVIDER] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('🚪 [AUTH PROVIDER] Signing out...');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ [AUTH PROVIDER] Sign out error:', error);
      } else {
        console.log('✅ [AUTH PROVIDER] Signed out successfully');
      }
    } catch (err) {
      console.error('❌ [AUTH PROVIDER] Sign out exception:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
