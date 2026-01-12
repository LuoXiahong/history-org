import { useState, useEffect, useCallback, type ReactNode } from 'react';
import type {
  AuthState,
  LoginCredentials,
  RegisterCredentials,
} from '../types/auth.types';
import { authApi } from '../api/auth.api';
import { AuthContext, type AuthContextType } from './auth-context';

// Clear any legacy localStorage data on initialization
function clearLegacyStorage(): void {
  try {
    localStorage.removeItem('history_org_token');
    localStorage.removeItem('history_org_user');
  } catch {
    // Silent fail
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true, // Always validate session on mount
  });

  // Clear legacy storage and validate session on mount
  useEffect(() => {
    clearLegacyStorage();

    async function validateSession(): Promise<void> {
      try {
        const user = await authApi.getCurrentUser();
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // No valid session, user is not authenticated
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    }

    validateSession();
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const user = await authApi.login(credentials);
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
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
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
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
      // Continue with logout even if API call fails
    } finally {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.getCurrentUser();
      setState((prev) => ({ ...prev, user, isLoading: false }));
    } catch {
      // Session invalid, logout
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
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
