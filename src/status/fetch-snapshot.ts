import { dayKey, daysAgo, toIso } from "../lib/dates";
import type { StandardsRecords } from "../standards/client";
import { isImpact, isIncidentStatus } from "../standards/options";
import { fetchAll } from "../standards/paginate";
import {
  check,
  dailyStat,
  incident,
  incidentUpdate,
  relatedIds,
  service,
} from "../standards/schema";
import {
  type CheckSnapshot,
  type DailyStatSnapshot,
  HISTORY_DAYS,
  type IncidentSnapshot,
  type IncidentUpdateSnapshot,
  RESOLVED_WINDOW_DAYS,
  type ServiceSnapshot,
  type StatusSnapshot,
} from "./snapshot";

function isoOrNull(value: string | Date | undefined | null): string | null {
  return value === null || value === undefined || value === "" ? null : toIso(value);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

async function loadServices(standards: StandardsRecords): Promise<ServiceSnapshot[]> {
  const records = await fetchAll(
    standards.from(service).eq("enabled", true).orderBy("position").orderBy("name")
  );
  return records.map((r) => ({
    id: r.id,
    name: r.name,
    position: r.position ?? 0,
  }));
}

async function loadLastChecks(
  standards: StandardsRecords,
  services: ServiceSnapshot[]
): Promise<CheckSnapshot[]> {
  const latest = await Promise.all(
    services.map((s) =>
      standards.from(check).eq("service", s.id).orderBy("checkedAt", "desc").single()
    )
  );
  return latest.flatMap((record) => {
    const checkedAt = record ? isoOrNull(record.checkedAt) : null;
    if (!record || !checkedAt) return [];
    return [
      {
        serviceId: record.service,
        ok: record.ok ?? false,
        statusCode: numberOrNull(record.statusCode),
        latencyMs: numberOrNull(record.latencyMs),
        checkedAt,
      },
    ];
  });
}

async function loadUpdates(
  standards: StandardsRecords,
  incidentIds: string[]
): Promise<Map<string, IncidentUpdateSnapshot[]>> {
  const grouped = new Map<string, IncidentUpdateSnapshot[]>();
  if (incidentIds.length === 0) return grouped;
  const records = await fetchAll(
    standards.from(incidentUpdate).in("incident", incidentIds).orderBy("postedAt", "desc")
  );
  for (const r of records) {
    const postedAt = isoOrNull(r.postedAt);
    if (!postedAt) continue;
    const key = r.incident;
    const list = grouped.get(key) ?? [];
    list.push({
      id: r.id,
      status: isIncidentStatus(r.status) ? r.status : null,
      message: r.message ?? "",
      postedAt,
    });
    grouped.set(key, list);
  }
  return grouped;
}

async function loadIncidents(standards: StandardsRecords, now: Date): Promise<IncidentSnapshot[]> {
  const since = daysAgo(now, RESOLVED_WINDOW_DAYS).toISOString();
  const [open, resolved] = await Promise.all([
    fetchAll(standards.from(incident).neq("status", "resolved").orderBy("startedAt", "desc")),
    fetchAll(
      standards
        .from(incident)
        .eq("status", "resolved")
        .gte("resolvedAt", since)
        .orderBy("resolvedAt", "desc")
    ),
  ]);
  const records = [...open, ...resolved];
  const updatesByIncident = await loadUpdates(
    standards,
    records.map((r) => r.id)
  );
  // The Standards UI creates a record before its required fields are filled: a
  // draft without a title or a start date is not an incident yet and is skipped.
  return records.flatMap((r) => {
    const startedAt = isoOrNull(r.startedAt);
    if (!r.title || !startedAt) return [];
    return [
      {
        id: r.id,
        title: r.title,
        status: isIncidentStatus(r.status) ? r.status : "investigating",
        impact: isImpact(r.impact) ? r.impact : "none",
        serviceIds: relatedIds(r.services),
        startedAt,
        resolvedAt: isoOrNull(r.resolvedAt),
        updates: updatesByIncident.get(r.id) ?? [],
      },
    ];
  });
}

async function loadDailyStats(
  standards: StandardsRecords,
  now: Date
): Promise<DailyStatSnapshot[]> {
  const since = dayKey(daysAgo(now, HISTORY_DAYS));
  const records = await fetchAll(standards.from(dailyStat).gte("day", since));
  return records.flatMap((r) => {
    const day = isoOrNull(r.day);
    if (!day) return [];
    return [
      {
        serviceId: r.service,
        day: day.slice(0, 10),
        total: r.total ?? 0,
        failed: r.failed ?? 0,
        avgLatencyMs: numberOrNull(r.avgLatencyMs),
      },
    ];
  });
}

/** Five reads; shared by the page (through the cache) and the cron route (to persist the blob). */
export async function fetchSnapshot(
  standards: StandardsRecords,
  now: Date
): Promise<StatusSnapshot> {
  const services = await loadServices(standards);
  const [lastChecks, incidents, dailyStats] = await Promise.all([
    loadLastChecks(standards, services),
    loadIncidents(standards, now),
    loadDailyStats(standards, now),
  ]);
  return {
    availability: "live",
    fetchedAt: now.toISOString(),
    reason: null,
    services,
    lastChecks,
    incidents,
    dailyStats,
  };
}
