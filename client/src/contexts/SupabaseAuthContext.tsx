// src/contexts/SupabaseAuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseConfig';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

// Provide a default value matching the type, including functions
const defaultAuthContextValue: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => { console.warn('AuthProvider not yet initialized'); },
  signOutUser: async () => { console.warn('AuthProvider not yet initialized'); },
};

const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'No user');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Memoize signInWithGoogle and re-throw errors
  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;
      // The auth state change listener will handle updating the user state
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false);
      throw error;
    }
  }, []);

  // Memoize signOutUser and re-throw errors
  const signOutUser = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // The auth state change listener will handle updating the user state
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false);
      throw error;
    }
  }, []);

  // Memoize the context value
  const value = useMemo(() => ({
    user,
    session,
    loading,
    signInWithGoogle,
    signOutUser,
  }), [user, session, loading, signInWithGoogle, signOutUser]);

  // Don't render children until loading is false to prevent flicker
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};
