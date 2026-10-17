import type { Outbox } from "../src/check/outbox";
import type { StatusSnapshot } from "../src/status/snapshot";
import type { JsonStore } from "../src/status/snapshot-store";

/** Test double for a blob document; `current` exposes what was last saved. */
function createMemoryStore<T>(): JsonStore<T> & { current: T | null } {
  const store = {
    current: null as T | null,
    async save(value: T) {
      store.current = value;
    },
    async load() {
      return store.current;
    },
  };
  return store;
}

export function createMemorySnapshotStore() {
  return createMemoryStore<StatusSnapshot>();
}

export function createMemoryOutboxStore() {
  return createMemoryStore<Outbox>();
}
