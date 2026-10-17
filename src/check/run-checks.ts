import { daysAgo } from "../lib/dates";
import { createLogger, errorFields } from "../lib/logger";
import type { StandardsRecords } from "../standards/client";
import { fetchAll } from "../standards/paginate";
import { check, dailyStat, service } from "../standards/schema";
import { isStandardsOutage } from "../status/resolve-status";
import type { CheckSnapshot } from "../status/snapshot";
import type { OutboxStore } from "../status/snapshot-store";
import { EMPTY_OUTBOX, type Outbox, type PendingCheck, type ServiceTarget } from "./outbox";
import { pingUrl } from "./ping";

export interface RunChecksDeps {
  standards: StandardsRecords;
  outbox: OutboxStore;
  now: () => Date;
  timeoutMs?: number;
}

export interface RunChecksResult {
  checked: number;
  up: number;
  down: number;
  writeErrors: number;
  purged: number;
  /** Pings still waiting in the outbox for Standards. */
  pending: number;
  /** Standards could not be read: the services came from the outbox and every ping was queued. */
  offline: boolean;
}

const DEFAULT_TIMEOUT_MS = 10_000;
/** Raw checks older than this are purged; daily stats keep the history. */
const RETENTION_DAYS = 7;
/** One page per run: the API caps a list at 100 records, and the cron runs again in five minutes. */
const PURGE_BATCH = 100;
/** Backlog written per run once Standards is back, on top of the run's own pings. */
const FLUSH_BATCH = 500;
/** Parallel raw-check writes. */
const WRITE_CONCURRENCY = 10;
/** About five days of seven services at one ping every five minutes; older pings are dropped first. */
const MAX_PENDING = 10_000;
const log = createLogger("check");

async function loadOutbox(store: OutboxStore): Promise<Outbox> {
  try {
    return (await store.load()) ?? EMPTY_OUTBOX;
  } catch (error) {
    log.error("check.outbox_load_failed", errorFields(error));
    return EMPTY_OUTBOX;
  }
}

/** Standards first; during an outage, the services the last run pinged. Throws when neither is available. */
async function loadTargets(
  standards: StandardsRecords,
  outbox: Outbox
): Promise<{ targets: ServiceTarget[]; offline: boolean }> {
  try {
    const records = await fetchAll(standards.from(service).eq("enabled", true));
    const targets = records.map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      expectedStatus: r.expectedStatus ?? 200,
    }));
    return { targets, offline: false };
  } catch (error) {
    if (!isStandardsOutage(error) || outbox.targets.length === 0) throw error;
    log.error("check.standards_unreachable", errorFields(error));
    return { targets: outbox.targets, offline: true };
  }
}

/** Adds a group of pings of one service and UTC day to its daily stat in a single read-modify-write. */
async function countInDailyStat(
  standards: StandardsRecords,
  serviceId: string,
  day: string,
  checks: PendingCheck[]
): Promise<void> {
  const stats = standards.from(dailyStat);
  const answered = checks.filter((c) => c.statusCode !== null);
  const failed = checks.filter((c) => !c.ok).length;
  const latencySum = answered.reduce((sum, c) => sum + c.latencyMs, 0);
  const existing = await stats.eq("service", serviceId).eq("day", day).single();
  if (!existing) {
    await stats.create({
      service: serviceId,
      day,
      total: checks.length,
      failed,
      responded: answered.length,
      ...(answered.length ? { avgLatencyMs: Math.round(latencySum / answered.length) } : {}),
    });
    return;
  }
  const previousResponded = existing.responded ?? 0;
  const nextResponded = previousResponded + answered.length;
  await stats.update(existing.id, {
    total: (existing.total ?? 0) + checks.length,
    failed: (existing.failed ?? 0) + failed,
    responded: nextResponded,
    ...(nextResponded === 0
      ? {}
      : {
          avgLatencyMs: Math.round(
            ((existing.avgLatencyMs ?? 0) * previousResponded + latencySum) / nextResponded
          ),
        }),
  });
}

async function createCheck(standards: StandardsRecords, pending: PendingCheck): Promise<void> {
  await standards.from(check).create({
    service: pending.serviceId,
    ok: pending.ok,
    latencyMs: pending.latencyMs,
    checkedAt: new Date(pending.checkedAt),
    ...(pending.statusCode === null ? {} : { statusCode: pending.statusCode }),
    ...(pending.error === null ? {} : { error: pending.error }),
  });
}

/**
 * Daily stats first, then raw checks. A stat that fails leaves its pings
 * uncounted; a check that fails stays queued as counted, so a retry never
 * counts a ping twice. Returns what is still pending and how many writes failed.
 */
async function writePending(
  standards: StandardsRecords,
  batch: PendingCheck[]
): Promise<{ remaining: PendingCheck[]; failures: number }> {
  const groups = new Map<string, PendingCheck[]>();
  for (const p of batch) {
    if (p.counted) continue;
    const key = `${p.serviceId}|${p.checkedAt.slice(0, 10)}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const counted = new Set<PendingCheck>(batch.filter((p) => p.counted));
  let failures = 0;
  const statWrites = await Promise.allSettled(
    [...groups.values()].map(async (checks) => {
      const [first] = checks;
      if (!first) return;
      await countInDailyStat(standards, first.serviceId, first.checkedAt.slice(0, 10), checks);
      for (const c of checks) counted.add(c);
    })
  );
  for (const write of statWrites) {
    if (write.status === "rejected") {
      failures += 1;
      log.error("check.stat_write_failed", errorFields(write.reason));
    }
  }

  const remaining = batch.filter((p) => !counted.has(p));
  const toCreate = batch.filter((p) => counted.has(p));
  for (let i = 0; i < toCreate.length; i += WRITE_CONCURRENCY) {
    const chunk = toCreate.slice(i, i + WRITE_CONCURRENCY);
    const writes = await Promise.allSettled(chunk.map((p) => createCheck(standards, p)));
    writes.forEach((write, index) => {
      const pending = chunk[index];
      if (write.status === "fulfilled" || !pending) return;
      failures += 1;
      log.error("check.write_failed", errorFields(write.reason));
      remaining.push({ ...pending, counted: true });
    });
  }
  return { remaining, failures };
}

async function purgeOldChecks(standards: StandardsRecords, cutoff: Date): Promise<number> {
  const old = await standards
    .from(check)
    .lt("checkedAt", cutoff.toISOString())
    .limit(PURGE_BATCH)
    .fetch();
  for (const record of old.records) {
    await standards.from(check).delete(record.id);
  }
  return old.records.length;
}

function toCheckSnapshot(p: PendingCheck): CheckSnapshot {
  return {
    serviceId: p.serviceId,
    ok: p.ok,
    statusCode: p.statusCode,
    latencyMs: p.latencyMs,
    checkedAt: p.checkedAt,
  };
}

/**
 * Pings every enabled service and records the results. A Standards outage
 * does not stop the pings: they wait in the outbox and are written, oldest
 * first, by the next run that reaches Standards. Throws only when Standards
 * fails on the initial read and no earlier run left a list of services.
 */
export async function runChecks(deps: RunChecksDeps): Promise<RunChecksResult> {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const checkedAt = deps.now();
  const outbox = await loadOutbox(deps.outbox);
  const { targets, offline } = await loadTargets(deps.standards, outbox);

  const fresh = await Promise.all(
    targets.map(async (target): Promise<PendingCheck> => {
      const result = await pingUrl(target.url, target.expectedStatus, timeoutMs);
      return {
        serviceId: target.id,
        checkedAt: checkedAt.toISOString(),
        ...result,
        counted: false,
      };
    })
  );

  let pending = [...outbox.pending, ...fresh];
  let writeErrors = 0;
  let purged = 0;
  if (!offline) {
    const backlog = outbox.pending.slice(0, FLUSH_BATCH);
    const { remaining, failures } = await writePending(deps.standards, [...backlog, ...fresh]);
    pending = [...outbox.pending.slice(FLUSH_BATCH), ...remaining];
    writeErrors += failures;
    if (backlog.length > 0) {
      log.info("check.outbox_flushed", { flushed: backlog.length, pending: pending.length });
    }
    try {
      purged = await purgeOldChecks(deps.standards, daysAgo(checkedAt, RETENTION_DAYS));
    } catch (error) {
      log.error("check.purge_failed", errorFields(error));
      writeErrors += 1;
    }
  }

  pending.sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
  if (pending.length > MAX_PENDING) {
    log.warn("check.outbox_overflow", { dropped: pending.length - MAX_PENDING });
    pending = pending.slice(-MAX_PENDING);
  }
  try {
    await deps.outbox.save({ targets, latest: fresh.map(toCheckSnapshot), pending });
  } catch (error) {
    log.error("check.outbox_save_failed", errorFields(error));
    writeErrors += 1;
  }

  const up = fresh.filter((p) => p.ok).length;
  return {
    checked: fresh.length,
    up,
    down: fresh.length - up,
    writeErrors,
    purged,
    pending: pending.length,
    offline,
  };
}
