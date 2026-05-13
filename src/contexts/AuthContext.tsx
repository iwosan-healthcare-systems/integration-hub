import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getMe, logoutUser, type User } from '@/services/authService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// A non-sensitive flag stored in localStorage so we know whether to call getMe()
// on mount. Avoids a round-trip to the API for users who have never logged in,
// making the login page appear instantly for first-time / logged-out visitors.
const SESSION_HINT = 'iwosan_has_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  // Only start in loading=true if we think a session might exist
  const [loading, setLoading] = useState(() => !!localStorage.getItem(SESSION_HINT));

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem(SESSION_HINT, '1');
    } else {
      localStorage.removeItem(SESSION_HINT);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    // No hint → definitely not logged in, skip the API call entirely
    if (!localStorage.getItem(SESSION_HINT)) {
      setLoading(false);
      return;
    }
    try {
      const me = await getMe();
      setUserState(me);
      if (!me) localStorage.removeItem(SESSION_HINT);
    } catch {
      setUserState(null);
      localStorage.removeItem(SESSION_HINT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await logoutUser();
    localStorage.removeItem(SESSION_HINT);
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
