import type { StatusSnapshot } from "../src/status/snapshot";
import type { SnapshotStore } from "../src/status/snapshot-store";

/** Test double for the blob store; `current` exposes what was last saved. */
export function createMemorySnapshotStore(): SnapshotStore & { current: StatusSnapshot | null } {
  const store = {
    current: null as StatusSnapshot | null,
    async save(snapshot: StatusSnapshot) {
      store.current = snapshot;
    },
    async load() {
      return store.current;
    },
  };
  return store;
}
