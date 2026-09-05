import { dayKey, daysAgo } from "../lib/dates";
import { createLogger, errorFields } from "../lib/logger";
import type { StandardsRecords } from "../standards/client";
import { fetchAll } from "../standards/paginate";
import { check, dailyStat, service } from "../standards/schema";
import { type PingResult, pingUrl } from "./ping";

export interface RunChecksDeps {
  standards: StandardsRecords;
  now: () => Date;
  timeoutMs?: number;
  retentionDays?: number;
  fetchImpl?: typeof fetch;
}

export interface RunChecksResult {
  checked: number;
  up: number;
  down: number;
  writeErrors: number;
  purged: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETENTION_DAYS = 7;
/** One page per run: the API caps a list at 100 records, and the cron runs again in five minutes. */
const PURGE_BATCH = 100;
const log = createLogger("check");

async function recordCheck(
  standards: StandardsRecords,
  serviceId: string,
  result: PingResult,
  checkedAt: Date
): Promise<void> {
  await standards.from(check).create({
    service: serviceId,
    ok: result.ok,
    latencyMs: result.latencyMs,
    checkedAt,
    ...(result.statusCode === null ? {} : { statusCode: result.statusCode }),
    ...(result.error === null ? {} : { error: result.error }),
  });
  await upsertDailyStat(standards, serviceId, result, dayKey(checkedAt));
}

async function upsertDailyStat(
  standards: StandardsRecords,
  serviceId: string,
  result: PingResult,
  day: string
): Promise<void> {
  const stats = standards.from(dailyStat);
  const existing = await stats.eq("service", serviceId).eq("day", day).single();
  const responded = result.statusCode === null ? 0 : 1;
  if (!existing) {
    await stats.create({
      service: serviceId,
      day,
      total: 1,
      failed: result.ok ? 0 : 1,
      responded,
      ...(responded ? { avgLatencyMs: result.latencyMs } : {}),
    });
    return;
  }
  const previousResponded = Number(existing.responded ?? 0);
  const previousAvg = Number(existing.avgLatencyMs ?? 0);
  const nextResponded = previousResponded + responded;
  const avgLatencyMs = responded
    ? Math.round((previousAvg * previousResponded + result.latencyMs) / nextResponded)
    : previousAvg;
  await stats.update(existing.id, {
    total: Number(existing.total ?? 0) + 1,
    failed: Number(existing.failed ?? 0) + (result.ok ? 0 : 1),
    responded: nextResponded,
    ...(nextResponded === 0 ? {} : { avgLatencyMs }),
  });
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

/** Pings every enabled service, records the results, purges old checks. Throws only when Standards itself fails on the initial read. */
export async function runChecks(deps: RunChecksDeps): Promise<RunChecksResult> {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retentionDays = deps.retentionDays ?? DEFAULT_RETENTION_DAYS;
  const checkedAt = deps.now();

  const services = await fetchAll(deps.standards.from(service).eq("enabled", true));

  const pings = await Promise.all(
    services.map(async (record) => ({
      record,
      result: await pingUrl(record.url, record.expectedStatus ?? 200, timeoutMs, deps.fetchImpl),
    }))
  );

  const writes = await Promise.allSettled(
    pings.map(({ record, result }) => recordCheck(deps.standards, record.id, result, checkedAt))
  );
  for (const write of writes) {
    if (write.status === "rejected") log.error("check.write_failed", errorFields(write.reason));
  }

  let writeErrors = writes.filter((w) => w.status === "rejected").length;
  let purged = 0;
  try {
    purged = await purgeOldChecks(deps.standards, daysAgo(checkedAt, retentionDays));
  } catch (error) {
    log.error("check.purge_failed", errorFields(error));
    writeErrors += 1;
  }

  const up = pings.filter((p) => p.result.ok).length;
  return { checked: pings.length, up, down: pings.length - up, writeErrors, purged };
}
