import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";

export interface ShellPreferencesState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const storageKey = "inventory.shell.preferences.v1";

export const createShellPreferencesStore = (storage?: StateStorage) =>
  create<ShellPreferencesState>()(
    persist(
      (set) => ({
        sidebarCollapsed: false,
        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      }),
      {
        name: storageKey,
        version: 1,
        storage: createJSONStorage(() => storage ?? localStorage),
        partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
      },
    ),
  );

export const useShellPreferences = createShellPreferencesStore();
