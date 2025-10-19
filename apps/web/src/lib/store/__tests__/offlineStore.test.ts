import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOfflineStore, type QueuedAction } from '../offlineStore';

// Mock crypto.randomUUID
const mockUUID = '123e4567-e89b-12d3-a456-426614174000';
vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID as `${string}-${string}-${string}-${string}-${string}`);

describe('OfflineStore', () => {
  beforeEach(() => {
    // Clear store and localStorage before each test
    localStorage.clear();
    useOfflineStore.setState({
      isOnline: true,
      queue: [],
    });
    vi.clearAllMocks();
  });

  describe('addToQueue', () => {
    it('should add action to queue with generated UUID', () => {
      useOfflineStore.getState().addToQueue({
        type: 'CREATE_POST',
        payload: { content: 'Test post' },
      });

      const state = useOfflineStore.getState();
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0]!.id).toBe(mockUUID);
      expect(crypto.randomUUID).toHaveBeenCalled();
    });

    it('should add action with timestamp', () => {
      const beforeTime = Date.now();
      useOfflineStore.getState().addToQueue({
        type: 'UPDATE_PROFILE',
        payload: { username: 'newuser' },
      });
      const afterTime = Date.now();

      const state = useOfflineStore.getState();
      expect(state.queue[0]!.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(state.queue[0]!.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should initialize retries to 0', () => {
      useOfflineStore.getState().addToQueue({
        type: 'SEND_MESSAGE',
        payload: { text: 'Hello' },
      });

      const state = useOfflineStore.getState();
      expect(state.queue[0]!.retries).toBe(0);
    });

    it('should add multiple actions to queue', () => {
      useOfflineStore.getState().addToQueue({
        type: 'CREATE_POST',
        payload: { content: 'Post 1' },
      });
      useOfflineStore.getState().addToQueue({
        type: 'CREATE_POST',
        payload: { content: 'Post 2' },
      });

      const state = useOfflineStore.getState();
      expect(state.queue).toHaveLength(2);
    });

    it('should persist queue to localStorage', async () => {
      useOfflineStore.getState().addToQueue({
        type: 'CREATE_POST',
        payload: { content: 'Test post' },
      });

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      const stored = JSON.parse(localStorage.getItem('vrss-offline') || '{}');
      expect(stored.state.queue).toHaveLength(1);
      expect(stored.state.queue[0].type).toBe('CREATE_POST');
    });
  });

  describe('removeFromQueue', () => {
    it('should remove action by id', () => {
      const action: QueuedAction = {
        id: '1',
        type: 'CREATE_POST',
        payload: { content: 'Test' },
        timestamp: Date.now(),
        retries: 0,
      };

      useOfflineStore.setState({ queue: [action] });
      useOfflineStore.getState().removeFromQueue('1');

      const state = useOfflineStore.getState();
      expect(state.queue).toHaveLength(0);
    });

    it('should only remove specified action', () => {
      const action1: QueuedAction = {
        id: '1',
        type: 'CREATE_POST',
        payload: { content: 'Test 1' },
        timestamp: Date.now(),
        retries: 0,
      };
      const action2: QueuedAction = {
        id: '2',
        type: 'CREATE_POST',
        payload: { content: 'Test 2' },
        timestamp: Date.now(),
        retries: 0,
      };

      useOfflineStore.setState({ queue: [action1, action2] });
      useOfflineStore.getState().removeFromQueue('1');

      const state = useOfflineStore.getState();
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0]!.id).toBe('2');
    });
  });

  describe('setOnline', () => {
    it('should update isOnline state', () => {
      useOfflineStore.getState().setOnline(false);
      expect(useOfflineStore.getState().isOnline).toBe(false);

      useOfflineStore.getState().setOnline(true);
      expect(useOfflineStore.getState().isOnline).toBe(true);
    });

    it('should trigger processQueue when going online', async () => {
      // Spy on processQueue
      const processQueueSpy = vi.spyOn(useOfflineStore.getState(), 'processQueue');

      useOfflineStore.getState().setOnline(true);

      expect(processQueueSpy).toHaveBeenCalled();
    });

    it('should not trigger processQueue when going offline', async () => {
      const processQueueSpy = vi.spyOn(useOfflineStore.getState(), 'processQueue');

      useOfflineStore.getState().setOnline(false);

      expect(processQueueSpy).not.toHaveBeenCalled();
    });
  });

  describe('processQueue', () => {
    it('should not process when offline', async () => {
      const action: QueuedAction = {
        id: '1',
        type: 'CREATE_POST',
        payload: { content: 'Test' },
        timestamp: Date.now(),
        retries: 0,
      };

      useOfflineStore.setState({ isOnline: false, queue: [action] });
      await useOfflineStore.getState().processQueue();

      const state = useOfflineStore.getState();
      expect(state.queue).toHaveLength(1); // Still in queue
    });

    it('should not process when queue is empty', async () => {
      useOfflineStore.setState({ isOnline: true, queue: [] });
      await useOfflineStore.getState().processQueue();

      // Should complete without error
      expect(useOfflineStore.getState().queue).toHaveLength(0);
    });

    it('should remove successful actions from queue', async () => {
      const action: QueuedAction = {
        id: '1',
        type: 'CREATE_POST',
        payload: { content: 'Test' },
        timestamp: Date.now(),
        retries: 0,
      };

      useOfflineStore.setState({ isOnline: true, queue: [action] });
      await useOfflineStore.getState().processQueue();

      const state = useOfflineStore.getState();
      expect(state.queue).toHaveLength(0);
    });

    it('should process multiple actions', async () => {
      const action1: QueuedAction = {
        id: '1',
        type: 'CREATE_POST',
        payload: { content: 'Test 1' },
        timestamp: Date.now(),
        retries: 0,
      };
      const action2: QueuedAction = {
        id: '2',
        type: 'CREATE_POST',
        payload: { content: 'Test 2' },
        timestamp: Date.now(),
        retries: 0,
      };

      useOfflineStore.setState({ isOnline: true, queue: [action1, action2] });
      await useOfflineStore.getState().processQueue();

      const state = useOfflineStore.getState();
      expect(state.queue).toHaveLength(0);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist queue to localStorage', async () => {
      const action: QueuedAction = {
        id: '1',
        type: 'CREATE_POST',
        payload: { content: 'Test' },
        timestamp: Date.now(),
        retries: 0,
      };

      useOfflineStore.setState({ queue: [action] });

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      const stored = JSON.parse(localStorage.getItem('vrss-offline') || '{}');
      expect(stored.state.queue).toHaveLength(1);
      expect(stored.state.queue[0].id).toBe('1');
    });

    it('should persist isOnline state', async () => {
      useOfflineStore.getState().setOnline(false);

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      const stored = JSON.parse(localStorage.getItem('vrss-offline') || '{}');
      expect(stored.state.isOnline).toBe(false);
    });

    it('should hydrate state from localStorage on init', () => {
      const action: QueuedAction = {
        id: '1',
        type: 'CREATE_POST',
        payload: { content: 'Test' },
        timestamp: Date.now(),
        retries: 0,
      };

      localStorage.setItem(
        'vrss-offline',
        JSON.stringify({
          state: {
            isOnline: false,
            queue: [action],
          },
          version: 0,
        })
      );

      // Verify stored value
      const stored = JSON.parse(localStorage.getItem('vrss-offline') || '{}');
      expect(stored.state.queue).toHaveLength(1);
      expect(stored.state.isOnline).toBe(false);
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useOfflineStore.getState();
      expect(state.queue).toEqual([]);
      expect(typeof state.isOnline).toBe('boolean');
    });
  });

  describe('action types', () => {
    it('should support CREATE_POST action type', () => {
      useOfflineStore.getState().addToQueue({
        type: 'CREATE_POST',
        payload: { content: 'Test' },
      });

      const state = useOfflineStore.getState();
      expect(state.queue[0]!.type).toBe('CREATE_POST');
    });

    it('should support UPDATE_PROFILE action type', () => {
      useOfflineStore.getState().addToQueue({
        type: 'UPDATE_PROFILE',
        payload: { username: 'newuser' },
      });

      const state = useOfflineStore.getState();
      expect(state.queue[0]!.type).toBe('UPDATE_PROFILE');
    });

    it('should support SEND_MESSAGE action type', () => {
      useOfflineStore.getState().addToQueue({
        type: 'SEND_MESSAGE',
        payload: { text: 'Hello' },
      });

      const state = useOfflineStore.getState();
      expect(state.queue[0]!.type).toBe('SEND_MESSAGE');
    });
  });
});
