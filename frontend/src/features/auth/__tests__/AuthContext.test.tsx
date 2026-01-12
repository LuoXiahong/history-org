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

const mockAuthResponse = {
  accessToken: 'mock-jwt-token',
  tokenType: 'Bearer',
  expiresIn: 86400,
  user: mockUser,
};

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should start as not authenticated when no token stored', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('should login successfully and store auth data', async () => {
    mockAuthApi.login.mockResolvedValue(mockAuthResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'Password123',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('mock-jwt-token');
    expect(localStorage.getItem('history_org_token')).toBe('mock-jwt-token');
  });

  it('should register successfully and store auth data', async () => {
    mockAuthApi.register.mockResolvedValue(mockAuthResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

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

  it('should logout and clear auth data', async () => {
    mockAuthApi.login.mockResolvedValue(mockAuthResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'Password123',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('history_org_token')).toBeNull();
  });

  it('should restore auth from localStorage on mount', async () => {
    localStorage.setItem('history_org_token', 'stored-token');
    localStorage.setItem('history_org_user', JSON.stringify(mockUser));
    mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('stored-token');
  });

  it('should clear auth if token validation fails', async () => {
    localStorage.setItem('history_org_token', 'invalid-token');
    localStorage.setItem('history_org_user', JSON.stringify(mockUser));
    mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Invalid token'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should throw error outside of provider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});
