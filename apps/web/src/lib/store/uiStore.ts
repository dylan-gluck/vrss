import { create } from "zustand";

interface UIState {
  theme: "light" | "dark" | "system";
  sidebarOpen: boolean;
  bottomNavVisible: boolean;
  activeModal: string | null;

  // Actions
  setTheme: (theme: "light" | "dark" | "system") => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setBottomNavVisible: (visible: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "system",
  sidebarOpen: true,
  bottomNavVisible: true,
  activeModal: null,

  setTheme: (theme) => {
    set({ theme });
    // Apply theme to document
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setBottomNavVisible: (visible) => set({ bottomNavVisible: visible }),

  openModal: (modalId) => set({ activeModal: modalId }),

  closeModal: () => set({ activeModal: null }),
}));
