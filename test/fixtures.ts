import { dayKey, daysAgo } from "../src/lib/dates";
import type { DailyStatSnapshot, IncidentSnapshot, StatusSnapshot } from "../src/status/snapshot";

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

/** Open, identified, major incident on the API service with two updates. */
export const majorIncident: IncidentSnapshot = {
  id: "inc-1",
  title: "Elevated API latency",
  status: "identified",
  impact: "major",
  serviceIds: ["svc-api"],
  startedAt: "2026-09-05T17:08:00.000Z",
  resolvedAt: null,
  updates: [
    {
      id: "u1",
      status: "investigating",
      message: "Looking into it.",
      postedAt: "2026-09-05T17:08:00.000Z",
    },
    {
      id: "u2",
      status: "identified",
      message: "Pool saturated.\n\nScaling out.",
      postedAt: "2026-09-05T17:30:00.000Z",
    },
  ],
};

/** The same incident, resolved 42 minutes after it started, three days before NOW. */
export const resolvedIncident: IncidentSnapshot = {
  ...majorIncident,
  id: "inc-r",
  status: "resolved",
  startedAt: "2026-09-02T10:00:00.000Z",
  resolvedAt: "2026-09-02T10:42:00.000Z",
};
