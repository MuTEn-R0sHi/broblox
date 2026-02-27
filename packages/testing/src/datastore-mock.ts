/**
 * Mock DataStore for Node.js/Vitest testing.
 *
 * Simulates Roblox DataStoreService for unit tests that need
 * to load/save player data without a real DataStore.
 */

// ============================================================================
// Mock DataStore
// ============================================================================

export interface MockDataStore {
  /** Internal backing store — inspect in tests. */
  store: Map<string, unknown>;
  GetAsync(key: string): unknown;
  SetAsync(key: string, value: unknown): void;
  UpdateAsync(key: string, callback: (old: unknown) => unknown): unknown;
  /** Reset all data in this store. */
  _reset(): void;
}

export function createMockDataStore(): MockDataStore {
  const store = new Map<string, unknown>();
  return {
    store,
    GetAsync(key: string) {
      return [store.get(key), undefined] as unknown;
    },
    SetAsync(key: string, value: unknown) {
      store.set(key, value);
    },
    UpdateAsync(key: string, callback: (old: unknown) => unknown) {
      const old = store.get(key);
      const updated = callback(old);
      store.set(key, updated);
      return updated;
    },
    _reset() {
      store.clear();
    },
  };
}

// ============================================================================
// Mock DataStoreService
// ============================================================================

export interface MockDataStoreService {
  /** Internal backing map — inspect in tests. */
  stores: Map<string, MockDataStore>;
  GetDataStore(name: string): MockDataStore;
  /** Get a store by name (for test inspection). */
  _getStore(name: string): MockDataStore;
  /** Reset all stores. */
  _reset(): void;
}

export function createMockDataStoreService(): MockDataStoreService {
  const stores = new Map<string, MockDataStore>();
  return {
    stores,
    GetDataStore(name: string) {
      if (!stores.has(name)) {
        stores.set(name, createMockDataStore());
      }
      return stores.get(name)!;
    },
    _getStore(name: string) {
      if (!stores.has(name)) {
        stores.set(name, createMockDataStore());
      }
      return stores.get(name)!;
    },
    _reset() {
      stores.forEach((s) => s._reset());
      stores.clear();
    },
  };
}
