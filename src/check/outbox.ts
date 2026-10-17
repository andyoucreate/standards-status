import type { CheckSnapshot, DailyStatSnapshot, StatusSnapshot } from "../status/snapshot";

/** A service as the cron pings it; kept in the outbox so pinging survives a Standards outage. */
export interface ServiceTarget {
  id: string;
  name: string;
  url: string;
  expectedStatus: number;
}

/** A ping Standards has not fully received yet. */
export interface PendingCheck {
  serviceId: string;
  checkedAt: string;
  ok: boolean;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
  /** The daily stat already counts it; only the raw check record is missing. */
  counted: boolean;
}

/** JSON-safe, like the snapshot: it round-trips through the blob unchanged. */
export interface Outbox {
  targets: ServiceTarget[];
  /** The newest ping of each service, whether or not Standards received it. */
  latest: CheckSnapshot[];
  /** Oldest first. */
  pending: PendingCheck[];
}

export const EMPTY_OUTBOX: Outbox = { targets: [], latest: [], pending: [] };

function newest(a: CheckSnapshot | undefined, b: CheckSnapshot | undefined): CheckSnapshot | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return b.checkedAt >= a.checkedAt ? b : a;
}

function withPending(stats: DailyStatSnapshot[], pending: PendingCheck[]): DailyStatSnapshot[] {
  const byKey = new Map(stats.map((s) => [`${s.serviceId}|${s.day}`, { ...s }]));
  for (const p of pending) {
    if (p.counted) continue;
    const day = p.checkedAt.slice(0, 10);
    const key = `${p.serviceId}|${day}`;
    const stat = byKey.get(key) ?? {
      serviceId: p.serviceId,
      day,
      total: 0,
      failed: 0,
      avgLatencyMs: null,
    };
    stat.total += 1;
    stat.failed += p.ok ? 0 : 1;
    byKey.set(key, stat);
  }
  return [...byKey.values()];
}

/**
 * Lays the pings Standards never received over the last snapshot it served:
 * the newest check per service and the uncounted failures in the daily bars.
 * Pure and idempotent — the snapshot is always the last live one, never an
 * earlier overlay, so a ping is counted once however many runs it waits.
 */
export function applyOutbox(snapshot: StatusSnapshot, outbox: Outbox | null): StatusSnapshot {
  if (!outbox) return snapshot;
  const lastChecks = snapshot.services.flatMap((service) => {
    const check = newest(
      snapshot.lastChecks.find((c) => c.serviceId === service.id),
      outbox.latest.find((c) => c.serviceId === service.id)
    );
    return check ? [check] : [];
  });
  const fetchedAt = lastChecks.reduce(
    (latest, c) => (c.checkedAt > latest ? c.checkedAt : latest),
    snapshot.fetchedAt
  );
  return {
    ...snapshot,
    fetchedAt,
    lastChecks,
    dailyStats: withPending(snapshot.dailyStats, outbox.pending),
  };
}
