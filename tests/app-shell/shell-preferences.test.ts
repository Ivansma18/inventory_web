import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StateStorage } from "zustand/middleware";

import { createShellPreferencesStore } from "@/app/state/shell-preferences";

const storageKey = "inventory.shell.preferences.v1";

describe("App Shell preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults the persistent sidebar to expanded", () => {
    const store = createShellPreferencesStore();

    expect(store.getState().sidebarCollapsed).toBe(false);
  });

  it("toggles the sidebar and persists only its versioned preference", () => {
    const store = createShellPreferencesStore();

    store.getState().toggleSidebar();

    expect(store.getState().sidebarCollapsed).toBe(true);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "null")).toEqual({
      state: { sidebarCollapsed: true },
      version: 1,
    });
  });

  it("restores a valid collapsed preference from the same browser", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ state: { sidebarCollapsed: true }, version: 1 }),
    );

    const store = createShellPreferencesStore();

    expect(store.getState().sidebarCollapsed).toBe(true);
    expect(typeof store.getState().toggleSidebar).toBe("function");
  });

  it.each([
    ["malformed JSON", "{"],
    [
      "a non-boolean preference",
      JSON.stringify({ state: { sidebarCollapsed: "collapsed" }, version: 1 }),
    ],
  ])("uses the expanded default and remains usable with %s", (_caseName, persistedValue) => {
    localStorage.setItem(storageKey, persistedValue);

    const store = createShellPreferencesStore();

    expect(store.getState().sidebarCollapsed).toBe(false);
    expect(() => store.getState().toggleSidebar()).not.toThrow();
    expect(store.getState().sidebarCollapsed).toBe(true);
  });

  it("continues in memory when reading and writing storage throws", () => {
    const storage: StateStorage = {
      getItem: () => {
        throw new Error("Storage access denied.");
      },
      setItem: () => {
        throw new Error("Storage access denied.");
      },
      removeItem: () => {
        throw new Error("Storage access denied.");
      },
    };
    const store = createShellPreferencesStore(storage);

    expect(store.getState().sidebarCollapsed).toBe(false);
    expect(() => store.getState().toggleSidebar()).not.toThrow();
    expect(store.getState().sidebarCollapsed).toBe(true);
  });
});
