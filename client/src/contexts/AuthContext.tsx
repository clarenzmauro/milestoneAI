// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig'; // Import auth and provider

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

// Provide a default value matching the type, including functions
const defaultAuthContextValue: AuthContextType = {
  user: null,
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
  const [loading, setLoading] = useState<boolean>(true); // Start loading until auth state is determined

  useEffect(() => {
    // Listener for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser?.displayName || 'No user');
      setUser(currentUser);
      setLoading(false); // Stop loading once we know the auth state
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Memoize signInWithGoogle and re-throw errors
  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle setting the user state and setLoading(false)
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false); // Ensure loading stops on error
      throw error; // Re-throw the error for components to handle
    }
  }, []); // No dependencies needed

  // Memoize signOutUser and re-throw errors
  const signOutUser = useCallback(async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting the user state to null and setLoading(false)
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false); // Ensure loading stops on error
      throw error; // Re-throw the error for components to handle
    }
  }, []); // No dependencies needed

  // Memoize the context value
  const value = useMemo(() => ({
    user,
    loading,
    signInWithGoogle,
    signOutUser,
  }), [user, loading, signInWithGoogle, signOutUser]); // Add dependencies

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
