import { useState, useEffect, useCallback, type ReactNode } from 'react';
import type {
  User,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
} from '../types/auth.types';
import { authApi } from '../api/auth.api';
import { AuthContext, type AuthContextType } from './auth-context';

// Migration cleanup: remove old localStorage tokens
const TOKEN_KEY = 'history_org_token';
const USER_KEY = 'history_org_user';

function clearOldAuthStorage(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Silent fail for storage errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Clear old localStorage tokens on mount (migration)
  useEffect(() => {
    clearOldAuthStorage();
  }, []);

  // Validate session on mount
  useEffect(() => {
    async function validateSession(): Promise<void> {
      try {
        const user = await authApi.getCurrentUser();
        setState({ user, isAuthenticated: true, isLoading: false });
      } catch {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
    validateSession();
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const user = await authApi.login(credentials);
        setState({ user, isAuthenticated: true, isLoading: false });
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const user = await authApi.register(credentials);
        setState({ user, isAuthenticated: true, isLoading: false });
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout
    }
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.getCurrentUser();
      setState((prev) => ({ ...prev, user, isLoading: false }));
    } catch {
      // Session is invalid, clear auth
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
