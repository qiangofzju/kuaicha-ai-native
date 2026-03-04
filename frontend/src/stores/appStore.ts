import { create } from "zustand";

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  theme: "dark",
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("kuaicha-theme", theme);
    }
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    if (typeof window !== "undefined") {
      localStorage.setItem("kuaicha-theme", next);
    }
    set({ theme: next });
  },
}));
