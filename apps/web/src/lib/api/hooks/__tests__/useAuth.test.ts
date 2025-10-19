/**
 * Auth Hooks Tests - Phase 4.3
 *
 * Tests for authentication-related TanStack Query hooks.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useLogin, useRegister, useLogout, useSession } from '../useAuth';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../client';

// Wrapper for QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('should login user and update auth store', async () => {
    const mockResponse = {
      user: { id: '1', username: 'test', email: 'test@test.com' },
      sessionToken: 'token-123',
    };

    vi.spyOn(api.auth, 'login').mockResolvedValue(mockResponse as any);

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    result.current.mutate({
      email: 'test@test.com',
      password: 'password123',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Check auth store was updated
    const authState = useAuthStore.getState();
    expect(authState.isAuthenticated).toBe(true);
    expect(authState.user).toEqual(mockResponse.user);
    expect(authState.token).toBe('token-123');
  });

  it('should handle login errors', async () => {
    vi.spyOn(api.auth, 'login').mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    result.current.mutate({
      email: 'test@test.com',
      password: 'wrong',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe('useRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('should register user and update auth store', async () => {
    const mockResponse = {
      user: { id: '1', username: 'newuser', email: 'new@test.com' },
      sessionToken: 'token-456',
    };

    vi.spyOn(api.auth, 'register').mockResolvedValue(mockResponse as any);

    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

    result.current.mutate({
      username: 'newuser',
      email: 'new@test.com',
      password: 'password123',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const authState = useAuthStore.getState();
    expect(authState.isAuthenticated).toBe(true);
    expect(authState.user?.username).toBe('newuser');
  });
});

describe('useLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should logout user and clear auth store', async () => {
    // Set up authenticated state
    useAuthStore.setState({
      user: { id: '1', username: 'test', email: 'test@test.com' },
      token: 'token-123',
      isAuthenticated: true,
      isLoading: false,
    });

    vi.spyOn(api.auth, 'logout').mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const authState = useAuthStore.getState();
    expect(authState.isAuthenticated).toBe(false);
    expect(authState.user).toBeNull();
    expect(authState.token).toBeNull();
  });
});

describe('useSession', () => {
  it('should fetch session when authenticated', async () => {
    useAuthStore.setState({
      user: { id: '1', username: 'test', email: 'test@test.com' },
      token: 'token-123',
      isAuthenticated: true,
      isLoading: false,
    });

    const mockSession = {
      user: { id: '1', username: 'test', email: 'test@test.com' },
      session: { id: 'session-1', expiresAt: new Date() },
    };

    vi.spyOn(api.auth, 'getSession').mockResolvedValue(mockSession as any);

    const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockSession);
  });

  it('should not fetch session when not authenticated', () => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

    expect(result.current.isPending).toBe(false);
  });
});
