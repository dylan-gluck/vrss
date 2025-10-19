import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface QueuedAction {
  id: string;
  type: 'CREATE_POST' | 'UPDATE_PROFILE' | 'SEND_MESSAGE';
  payload: any;
  timestamp: number;
  retries: number;
}

interface OfflineState {
  isOnline: boolean;
  queue: QueuedAction[];

  // Actions
  setOnline: (online: boolean) => void;
  addToQueue: (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) => void;
  removeFromQueue: (id: string) => void;
  processQueue: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: navigator.onLine,
      queue: [],

      setOnline: (online) => {
        set({ isOnline: online });
        // Auto-trigger processQueue when going online
        if (online) {
          get().processQueue();
        }
      },

      addToQueue: (action) => {
        const queuedAction: QueuedAction = {
          ...action,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          retries: 0,
        };

        set((state) => ({
          queue: [...state.queue, queuedAction],
        }));
      },

      removeFromQueue: (id) => {
        set((state) => ({
          queue: state.queue.filter((action) => action.id !== id),
        }));
      },

      processQueue: async () => {
        const { queue, isOnline } = get();

        if (!isOnline || queue.length === 0) {
          return;
        }

        // Process each action in the queue
        for (const action of queue) {
          try {
            // TODO: In Phase 4.3, this will call the actual RPC client
            // For now, we simulate success/failure based on retries
            // This is a placeholder that will be replaced with real API calls

            // Simulate API call
            await new Promise((resolve, reject) => {
              setTimeout(() => {
                // Simulate success (in real implementation, this will be an actual API call)
                resolve(true);
              }, 100);
            });

            // On success, remove from queue
            get().removeFromQueue(action.id);
          } catch (error) {
            // On error, increment retries
            const maxRetries = 3;

            if (action.retries >= maxRetries) {
              // Max retries reached, remove from queue
              get().removeFromQueue(action.id);
              console.error(`Action ${action.id} failed after ${maxRetries} retries`, error);
            } else {
              // Increment retry count
              set((state) => ({
                queue: state.queue.map((a) =>
                  a.id === action.id ? { ...a, retries: a.retries + 1 } : a
                ),
              }));
            }
          }
        }
      },
    }),
    {
      name: 'vrss-offline',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnline(true);
  });

  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnline(false);
  });
}
