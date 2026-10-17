import { StandardsAuthError, StandardsRequestError } from "@stndrds/client";
import { applyOutbox } from "../check/outbox";
import { createLogger, errorFields } from "../lib/logger";
import { type StatusSnapshot, unavailableSnapshot } from "./snapshot";
import type { OutboxStore, SnapshotStore } from "./snapshot-store";

export interface ResolveStatusDeps {
  fetchSnapshot: () => Promise<StatusSnapshot>;
  store: SnapshotStore;
  outbox: OutboxStore;
  now: Date;
}

const log = createLogger("status");

/** The `reason` a degraded snapshot carries when the schema source was never synced to this workspace. */
export const SCHEMA_MISSING = "schema_missing";

/** Connection refused / timeout (status 0) or a 5xx: Standards is down, and will come back. */
export function isStandardsOutage(error: unknown): boolean {
  return (
    error instanceof StandardsRequestError &&
    !(error instanceof StandardsAuthError) &&
    (error.status === 0 || error.status >= 500)
  );
}

/** An outage, or a key that no longer works: Standards cannot serve us right now. */
export function isStandardsUnreachable(error: unknown): boolean {
  return error instanceof StandardsAuthError || isStandardsOutage(error);
}

/** A 404 on a records route: the workspace answers but has none of our objects — `pnpm schema:sync` was not run. */
export function isSchemaMissing(error: unknown): boolean {
  return (
    error instanceof StandardsRequestError &&
    !(error instanceof StandardsAuthError) &&
    error.status === 404
  );
}

function degradedReason(error: unknown): string | null {
  if (isSchemaMissing(error)) return SCHEMA_MISSING;
  if (error instanceof StandardsAuthError) return error.code ?? "auth";
  if (isStandardsUnreachable(error)) return "unreachable";
  return null;
}

/**
 * Never throws for a Standards outage or an unsynced workspace: falls back to
 * the stored snapshot (`stale`), with the pings the cron kept taking laid over
 * it, or to an empty one (`unavailable`). A missing schema never serves a stale
 * snapshot — the objects are gone, not the network.
 */
/** The overlay is a bonus: a blob failure here still serves the bare snapshot. */
async function loadOutbox(store: OutboxStore) {
  try {
    return await store.load();
  } catch (error) {
    log.warn("status.outbox_load_failed", errorFields(error));
    return null;
  }
}

export async function resolveStatus(deps: ResolveStatusDeps): Promise<StatusSnapshot> {
  try {
    return await deps.fetchSnapshot();
  } catch (error) {
    const reason = degradedReason(error);
    if (reason === null) throw error;
    log.warn("status.standards_unavailable", { reason, ...errorFields(error) });
    const last = reason === SCHEMA_MISSING ? null : await deps.store.load();
    if (last)
      return { ...applyOutbox(last, await loadOutbox(deps.outbox)), availability: "stale", reason };
    return unavailableSnapshot(deps.now.toISOString(), reason);
  }
}
