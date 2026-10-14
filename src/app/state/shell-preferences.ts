import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PersistStorage, StateStorage } from "zustand/middleware";

export interface ShellPreferencesState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

type PersistedShellPreferences = Pick<ShellPreferencesState, "sidebarCollapsed">;

const storageKey = "inventory.shell.preferences.v1";

const memoryStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const createSafeStorage = (storage?: StateStorage): PersistStorage<PersistedShellPreferences> => {
  const jsonStorage =
    createJSONStorage<PersistedShellPreferences>(() => storage ?? localStorage) ??
    createJSONStorage<PersistedShellPreferences>(() => memoryStorage)!;

  return {
    getItem: (name) => {
      try {
        const value = jsonStorage.getItem(name);
        return value instanceof Promise ? value.catch(() => null) : value;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        const result = jsonStorage.setItem(name, value);
        return result instanceof Promise ? result.catch(() => undefined) : result;
      } catch {
        return undefined;
      }
    },
    removeItem: (name) => {
      try {
        const result = jsonStorage.removeItem(name);
        return result instanceof Promise ? result.catch(() => undefined) : result;
      } catch {
        return undefined;
      }
    },
  };
};

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
        storage: createSafeStorage(storage),
        partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
        merge: (persistedState, currentState) => {
          const persistedSidebarCollapsed =
            typeof persistedState === "object" &&
            persistedState !== null &&
            "sidebarCollapsed" in persistedState &&
            typeof persistedState.sidebarCollapsed === "boolean"
              ? persistedState.sidebarCollapsed
              : currentState.sidebarCollapsed;

          return { ...currentState, sidebarCollapsed: persistedSidebarCollapsed };
        },
      },
    ),
  );

export const useShellPreferences = createShellPreferencesStore();
