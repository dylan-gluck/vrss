import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface QueuedAction {
  id: string;
  type: "CREATE_POST" | "UPDATE_PROFILE" | "SEND_MESSAGE" | "RPC_CALL";
  payload: any;
  timestamp: number;
  retries: number;
}

interface OfflineState {
  isOnline: boolean;
  queue: QueuedAction[];

  // Actions
  setOnline: (online: boolean) => void;
  addToQueue: (action: Omit<QueuedAction, "id" | "timestamp" | "retries">) => void;
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
            // Process action based on type
            if (action.type === "RPC_CALL") {
              // Dynamically import rpcClient to avoid circular dependency
              const { rpcClient } = await import("../api/client");

              // Call the RPC procedure
              await rpcClient.call(action.payload.procedure, action.payload.input, {
                mutation: true,
              });
            } else {
              // For backward compatibility with old action types
              // Map old types to RPC procedures
              const procedureMap: Record<string, string> = {
                CREATE_POST: "post.create",
                UPDATE_PROFILE: "user.updateProfile",
                SEND_MESSAGE: "message.send",
              };

              const procedure = procedureMap[action.type];
              if (procedure) {
                const { rpcClient } = await import("../api/client");
                await rpcClient.call(procedure, action.payload, { mutation: true });
              }
            }

            // On success, remove from queue
            get().removeFromQueue(action.id);
            console.log(`Successfully processed queued action ${action.id}`);
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
              console.warn(
                `Action ${action.id} failed, will retry (${action.retries + 1}/${maxRetries})`
              );
            }
          }
        }
      },
    }),
    {
      name: "vrss-offline",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Listen for online/offline events
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    useOfflineStore.getState().setOnline(true);
  });

  window.addEventListener("offline", () => {
    useOfflineStore.getState().setOnline(false);
  });
}
