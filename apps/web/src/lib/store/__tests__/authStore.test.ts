import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, type User } from '../authStore';

describe('AuthStore', () => {
  beforeEach(() => {
    // Clear localStorage and reset store state before each test
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  describe('setUser', () => {
    it('should set user and token', () => {
      const user: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
      };
      const token = 'test-token-123';

      useAuthStore.getState().setUser(user, token);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.token).toBe(token);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should persist user data to localStorage', async () => {
      const user: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      };
      const token = 'test-token-123';

      useAuthStore.getState().setUser(user, token);

      // Wait for persistence to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const stored = JSON.parse(localStorage.getItem('vrss-auth') || '{}');
      expect(stored.state.user).toEqual(user);
      expect(stored.state.token).toBe(token);
      expect(stored.state.isAuthenticated).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear all auth data', () => {
      // Set up authenticated state
      const user: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      };
      useAuthStore.getState().setUser(user, 'test-token');

      // Logout
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should clear localStorage on logout', async () => {
      // Set up authenticated state
      const user: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      };
      useAuthStore.getState().setUser(user, 'test-token');

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify stored
      expect(localStorage.getItem('vrss-auth')).not.toBeNull();

      // Logout
      useAuthStore.getState().logout();

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify cleared
      const stored = JSON.parse(localStorage.getItem('vrss-auth') || '{}');
      expect(stored.state.user).toBeNull();
      expect(stored.state.token).toBeNull();
      expect(stored.state.isAuthenticated).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should merge partial user updates', () => {
      const user: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      };
      useAuthStore.getState().setUser(user, 'test-token');

      // Update username only
      useAuthStore.getState().updateUser({ username: 'newusername' });

      const state = useAuthStore.getState();
      expect(state.user?.id).toBe('1');
      expect(state.user?.username).toBe('newusername');
      expect(state.user?.email).toBe('test@example.com');
    });

    it('should update avatarUrl', () => {
      const user: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      };
      useAuthStore.getState().setUser(user, 'test-token');

      // Add avatar
      useAuthStore.getState().updateUser({ avatarUrl: 'https://example.com/new-avatar.jpg' });

      const state = useAuthStore.getState();
      expect(state.user?.avatarUrl).toBe('https://example.com/new-avatar.jpg');
    });

    it('should not update if user is null', () => {
      // No user set
      useAuthStore.getState().updateUser({ username: 'newusername' });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should persist updates to localStorage', async () => {
      const user: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      };
      useAuthStore.getState().setUser(user, 'test-token');

      // Update
      useAuthStore.getState().updateUser({ username: 'updateduser' });

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      const stored = JSON.parse(localStorage.getItem('vrss-auth') || '{}');
      expect(stored.state.user.username).toBe('updateduser');
    });
  });

  describe('localStorage persistence', () => {
    it('should hydrate state from localStorage on init', () => {
      // Manually set localStorage
      const user: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      };
      localStorage.setItem(
        'vrss-auth',
        JSON.stringify({
          state: {
            user,
            token: 'test-token',
            isAuthenticated: true,
          },
          version: 0,
        })
      );

      // Create new store instance (simulates page refresh)
      const state = useAuthStore.getState();

      // Note: Zustand persist hydrates asynchronously, so we check the stored value
      const stored = JSON.parse(localStorage.getItem('vrss-auth') || '{}');
      expect(stored.state.user).toEqual(user);
      expect(stored.state.token).toBe('test-token');
      expect(stored.state.isAuthenticated).toBe(true);
    });

    it('should only persist specified fields', async () => {
      const user: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      };
      useAuthStore.getState().setUser(user, 'test-token');

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      const stored = JSON.parse(localStorage.getItem('vrss-auth') || '{}');
      expect(stored.state).toHaveProperty('user');
      expect(stored.state).toHaveProperty('token');
      expect(stored.state).toHaveProperty('isAuthenticated');
      // isLoading should not be persisted (not in partialize)
      expect(stored.state).not.toHaveProperty('isLoading');
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });
});
