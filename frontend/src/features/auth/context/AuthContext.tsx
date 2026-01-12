import { useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, AuthState } from '../types/auth.types';
import { authApi } from '../api/auth.api';
import { AuthContext, type AuthContextType } from './auth-context';

const TOKEN_KEY = 'history_org_token';
const USER_KEY = 'history_org_user';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getStoredUser(): User | null {
  try {
    const userJson = localStorage.getItem(USER_KEY);
    return userJson ? (JSON.parse(userJson) as User) : null;
  } catch {
    return null;
  }
}

function storeAuth(token: string, user: User): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Silent fail for storage errors
  }
}

function clearStoredAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Silent fail for storage errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = getStoredToken();
    const user = getStoredUser();
    return {
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading: !!token, // If there's a token, we'll validate it
    };
  });

  const setAuth = useCallback((token: string | null, user: User | null) => {
    if (token && user) {
      storeAuth(token, user);
    } else {
      clearStoredAuth();
    }
    setState({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading: false,
    });
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const response = await authApi.login(credentials);
        setAuth(response.accessToken, response.user);
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [setAuth],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const response = await authApi.register(credentials);
        setAuth(response.accessToken, response.user);
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [setAuth],
  );

  const logout = useCallback(() => {
    setAuth(null, null);
  }, [setAuth]);

  const refreshUser = useCallback(async () => {
    if (!state.token) return;
    try {
      const user = await authApi.getCurrentUser();
      setState((prev) => ({ ...prev, user, isLoading: false }));
      storeAuth(state.token, user);
    } catch {
      // Token is invalid, clear auth
      setAuth(null, null);
    }
  }, [state.token, setAuth]);

  // Validate token on mount
  useEffect(() => {
    async function validateToken(): Promise<void> {
      if (!state.token) return;
      try {
        const user = await authApi.getCurrentUser();
        setState((prev) => ({ ...prev, user, isLoading: false }));
        storeAuth(state.token, user);
      } catch {
        clearStoredAuth();
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    }

    if (state.token && state.isLoading) {
      validateToken();
    }
  }, [state.token, state.isLoading]);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
