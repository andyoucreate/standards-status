import { BlobNotFoundError, head, put } from "@vercel/blob";
import type { StatusSnapshot } from "./snapshot";

export interface SnapshotStore {
  save(snapshot: StatusSnapshot): Promise<void>;
  load(): Promise<StatusSnapshot | null>;
}

const PATHNAME = "status/snapshot.json";

/** Last-known-good snapshot on Vercel Blob. Without a token both operations are no-ops. */
export function createBlobSnapshotStore(token: string | undefined): SnapshotStore {
  if (!token) {
    return { save: async () => {}, load: async () => null };
  }
  return {
    async save(snapshot) {
      await put(PATHNAME, JSON.stringify(snapshot), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
        token,
      });
    },
    async load() {
      try {
        const meta = await head(PATHNAME, { token });
        const response = await fetch(meta.url, { cache: "no-store" });
        if (!response.ok) return null;
        return (await response.json()) as StatusSnapshot;
      } catch (error) {
        if (error instanceof BlobNotFoundError) return null;
        throw error;
      }
    },
  };
}

let instance: SnapshotStore | null = null;

export function getSnapshotStore(): SnapshotStore {
  if (!instance) instance = createBlobSnapshotStore(process.env.BLOB_READ_WRITE_TOKEN);
  return instance;
}
