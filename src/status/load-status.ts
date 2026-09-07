import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { getStandards } from "../standards/client";
import { deriveStatusView, type StatusView } from "./derive";
import { fetchSnapshot } from "./fetch-snapshot";
import { resolveStatus } from "./resolve-status";
import { getSnapshotStore } from "./snapshot-store";

export const STATUS_CACHE_TAG = "status";

/**
 * Immediate expiration, not a stale-while-revalidate profile. A named profile
 * such as `"max"` lets the cron's revalidation serve the *previous* entry to the
 * next visitor and only rebuild in the background, so a cold load always showed
 * one generation of data behind — starting with the one built at deploy time,
 * which is why a fresh instance greeted everyone with a lone segment at 100%.
 * `expire: 0` expires the entry outright: the first request after a run pays the
 * rebuild and every visitor sees the run that just happened.
 */
export function revalidateStatus(): void {
  revalidateTag(STATUS_CACHE_TAG, { expire: 0 });
}

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
