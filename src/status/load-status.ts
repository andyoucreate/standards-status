import { cacheLife, cacheTag } from "next/cache";
import { getStandards } from "../standards/client";
import { deriveStatusView, type StatusView } from "./derive";
import { fetchSnapshot } from "./fetch-snapshot";
import { resolveStatus } from "./resolve-status";
import { getSnapshotStore } from "./snapshot-store";

export const STATUS_CACHE_TAG = "status";

/** Cached view of the whole page; the cron route revalidates the tag after each run. */
export async function loadStatusView(): Promise<StatusView> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  cacheTag(STATUS_CACHE_TAG);
  const now = new Date();
  const snapshot = await resolveStatus({
    fetchSnapshot: () => fetchSnapshot(getStandards(), now),
    store: getSnapshotStore(),
    now,
  });
  return deriveStatusView(snapshot, now);
}
