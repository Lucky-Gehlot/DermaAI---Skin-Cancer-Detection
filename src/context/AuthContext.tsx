import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { api } from '../lib/api';
import { auth, googleAuthProvider, syncFirebaseUserProfile } from '../lib/firebase';
import type { UserPublic } from '../shared/types';

interface AuthContextValue {
  user: UserPublic | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserPublic>;
  register: (email: string, password: string, displayName: string) => Promise<UserPublic>;
  loginWithGoogle: () => Promise<UserPublic>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const res = await api.register({ email, password, displayName });
    setUser(res.user);
    return res.user;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await credential.user.getIdToken();
    const res = await api.googleLogin(idToken);
    setUser(res.user);
    // Sync user profile document to Firestore when authenticated with Firebase
    syncFirebaseUserProfile(res.user).catch((err) => {
      console.warn('Firestore profile sync skipped or warned:', err);
    });
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    try {
      await signOut(auth);
    } catch {
      // Ignore if user signed in with local credentials only
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
