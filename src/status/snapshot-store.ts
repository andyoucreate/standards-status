import { BlobNotFoundError, head, put } from "@vercel/blob";
import type { Outbox } from "../check/outbox";
import type { StatusSnapshot } from "./snapshot";

export interface JsonStore<T> {
  save(value: T): Promise<void>;
  load(): Promise<T | null>;
}

export type SnapshotStore = JsonStore<StatusSnapshot>;
export type OutboxStore = JsonStore<Outbox>;

/** One JSON document on Vercel Blob. Without a token both operations are no-ops. */
function createBlobJsonStore<T>(token: string | undefined, pathname: string): JsonStore<T> {
  if (!token) {
    return { save: async () => {}, load: async () => null };
  }
  return {
    async save(value) {
      await put(pathname, JSON.stringify(value), {
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
        const meta = await head(pathname, { token });
        const response = await fetch(meta.url, { cache: "no-store" });
        if (!response.ok) return null;
        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof BlobNotFoundError) return null;
        throw error;
      }
    },
  };
}

/** Last-known-good snapshot, written after every run that could read Standards. */
export function createBlobSnapshotStore(token: string | undefined): SnapshotStore {
  return createBlobJsonStore(token, "status/snapshot.json");
}

/** What the cron needs to keep pinging, and the pings it could not write, while Standards is down. */
export function createBlobOutboxStore(token: string | undefined): OutboxStore {
  return createBlobJsonStore(token, "status/outbox.json");
}

let snapshotStore: SnapshotStore | null = null;
let outboxStore: OutboxStore | null = null;

export function getSnapshotStore(): SnapshotStore {
  if (!snapshotStore) snapshotStore = createBlobSnapshotStore(process.env.BLOB_READ_WRITE_TOKEN);
  return snapshotStore;
}

export function getOutboxStore(): OutboxStore {
  if (!outboxStore) outboxStore = createBlobOutboxStore(process.env.BLOB_READ_WRITE_TOKEN);
  return outboxStore;
}
