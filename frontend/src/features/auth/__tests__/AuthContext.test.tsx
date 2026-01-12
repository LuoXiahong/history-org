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

  it('should validate session from cookie on mount', async () => {
    mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAuthApi.getCurrentUser).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('should start as not authenticated when session invalid', async () => {
    mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should login successfully', async () => {
    mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
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

  it('should register successfully', async () => {
    mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
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
    expect(mockAuthApi.register).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'Password123',
      name: 'New User',
    });
  });

  it('should logout and clear auth data', async () => {
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

    expect(mockAuthApi.logout).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should clear old localStorage tokens on mount', async () => {
    localStorage.setItem('history_org_token', 'old-token');
    localStorage.setItem('history_org_user', JSON.stringify(mockUser));
    mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);

    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(localStorage.getItem('history_org_token')).toBeNull();
      expect(localStorage.getItem('history_org_user')).toBeNull();
    });
  });

  it('should throw error outside of provider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});
