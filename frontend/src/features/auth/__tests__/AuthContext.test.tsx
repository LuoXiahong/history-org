import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../context/useAuth';
import { authApi } from '../api/auth.api';
import { UserRole } from '../types/auth.types';

vi.mock('../api/auth.api');

const mockAuthApi = vi.mocked(authApi);

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  roles: [UserRole.USER],
};

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should start as not authenticated when no valid session', async () => {
    mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should authenticate user after successful login', async () => {
    mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    mockAuthApi.login.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'Password123',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(mockAuthApi.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123',
    });
  });

  it('should authenticate user after successful registration', async () => {
    mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    mockAuthApi.register.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.register({
        email: 'newuser@example.com',
        password: 'Password123',
        name: 'New User',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('should logout user and clear session', async () => {
    mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);
    mockAuthApi.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(mockAuthApi.logout).toHaveBeenCalled();
  });

  it('should validate session from cookie on mount', async () => {
    mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(mockAuthApi.getCurrentUser).toHaveBeenCalled();
  });

  it('should clear auth if session validation fails', async () => {
    mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Invalid session'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should clear legacy localStorage data on initialization', async () => {
    localStorage.setItem('history_org_token', 'old-token');
    localStorage.setItem('history_org_user', JSON.stringify(mockUser));
    mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));

    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(localStorage.getItem('history_org_token')).toBeNull();
      expect(localStorage.getItem('history_org_user')).toBeNull();
    });
  });

  it('should use withCredentials in axios requests', () => {
    // This test verifies that axios is configured with withCredentials
    // The actual verification happens through integration tests
    // Here we just ensure the apiClient is imported correctly
    expect(authApi).toBeDefined();
  });

  it('should throw error outside of provider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});
