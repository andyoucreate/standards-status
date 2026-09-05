import { dayKey, daysAgo } from "../src/lib/dates";
import type { DailyStatSnapshot, StatusSnapshot } from "../src/status/snapshot";

export const NOW = new Date("2026-09-05T17:42:00.000Z");

function fullStats(serviceId: string): DailyStatSnapshot[] {
  return Array.from({ length: 90 }, (_, i) => ({
    serviceId,
    day: dayKey(daysAgo(NOW, i)),
    total: 288,
    failed: 0,
    avgLatencyMs: 120,
  }));
}

export function liveSnapshot(overrides: Partial<StatusSnapshot> = {}): StatusSnapshot {
  return {
    availability: "live",
    fetchedAt: NOW.toISOString(),
    reason: null,
    services: [
      { id: "svc-web", name: "Website", position: 0 },
      { id: "svc-api", name: "API", position: 1 },
    ],
    lastChecks: [
      {
        serviceId: "svc-web",
        ok: true,
        statusCode: 200,
        latencyMs: 182,
        checkedAt: "2026-09-05T17:40:00.000Z",
      },
      {
        serviceId: "svc-api",
        ok: true,
        statusCode: 200,
        latencyMs: 96,
        checkedAt: "2026-09-05T17:40:00.000Z",
      },
    ],
    incidents: [],
    dailyStats: [...fullStats("svc-web"), ...fullStats("svc-api")],
    ...overrides,
  };
}
