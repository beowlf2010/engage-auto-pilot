
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  console.log('useAuth: Hook called');
  const context = useContext(AuthContext);
  if (!context) {
    console.error('useAuth: Called outside of AuthProvider context');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  console.log('useAuth: Returning context:', {
    hasUser: !!context.user,
    hasProfile: !!context.profile,
    loading: context.loading
  });
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('AuthProvider: Initializing...');
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed:', event, !!session);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('AuthProvider: Fetching profile for user:', session.user.id);
          // Use setTimeout to prevent recursive issues
          setTimeout(async () => {
            try {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (error) {
                console.error('AuthProvider: Profile fetch error:', error);
              } else {
                console.log('AuthProvider: Profile fetched:', profile);
              }
              
              setProfile(profile);
              setLoading(false);
            } catch (err) {
              console.error('AuthProvider: Profile fetch exception:', err);
              setProfile(null);
              setLoading(false);
            }
          }, 0);
        } else {
          console.log('AuthProvider: No session, clearing profile');
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    console.log('AuthProvider: Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Initial session check:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setLoading(false);
      }
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('AuthProvider: Attempting sign in for:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('AuthProvider: Sign in error:', error);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    console.log('AuthProvider: Attempting sign up for:', email);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    if (error) {
      console.error('AuthProvider: Sign up error:', error);
    }
    return { error };
  };

  const signOut = async () => {
    console.log('AuthProvider: Signing out');
    await supabase.auth.signOut();
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  console.log('AuthProvider: Current state:', { 
    hasUser: !!user, 
    hasProfile: !!profile, 
    loading,
    profileRole: profile?.role 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
