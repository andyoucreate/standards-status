import { StandardsAuthError, StandardsRequestError } from "@stndrds/client";
import { createLogger, errorFields } from "../lib/logger";
import { type StatusSnapshot, unavailableSnapshot } from "./snapshot";
import type { SnapshotStore } from "./snapshot-store";

export interface ResolveStatusDeps {
  fetchSnapshot: () => Promise<StatusSnapshot>;
  store: SnapshotStore;
  now: Date;
}

const log = createLogger("status");

/** Connection refused / timeout (status 0), a 5xx, or a key that no longer works: Standards cannot serve us right now. */
export function isStandardsUnreachable(error: unknown): boolean {
  if (error instanceof StandardsAuthError) return true;
  return error instanceof StandardsRequestError && (error.status === 0 || error.status >= 500);
}

/** Never throws for a Standards outage: falls back to the stored snapshot (`stale`) or an empty one (`unavailable`). */
export async function resolveStatus(deps: ResolveStatusDeps): Promise<StatusSnapshot> {
  try {
    return await deps.fetchSnapshot();
  } catch (error) {
    if (!isStandardsUnreachable(error)) throw error;
    const reason = error instanceof StandardsAuthError ? (error.code ?? "auth") : "unreachable";
    log.warn("status.standards_unavailable", { reason, ...errorFields(error) });
    const last = await deps.store.load();
    if (last) return { ...last, availability: "stale", reason };
    return unavailableSnapshot(deps.now.toISOString(), reason);
  }
}
