import type { Impact, IncidentStatus } from "../standards/options";

export type Availability = "live" | "stale" | "unavailable";

export interface ServiceSnapshot {
  id: string;
  name: string;
  position: number;
}
export interface CheckSnapshot {
  serviceId: string;
  ok: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  checkedAt: string;
}
export interface IncidentUpdateSnapshot {
  id: string;
  status: IncidentStatus | null;
  message: string;
  postedAt: string;
}
export interface IncidentSnapshot {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: Impact;
  serviceIds: string[];
  startedAt: string;
  resolvedAt: string | null;
  updates: IncidentUpdateSnapshot[];
}
export interface DailyStatSnapshot {
  serviceId: string;
  day: string;
  total: number;
  failed: number;
  avgLatencyMs: number | null;
}

/** JSON-safe: every date is an ISO string so the snapshot round-trips through the blob unchanged. */
export interface StatusSnapshot {
  availability: Availability;
  fetchedAt: string;
  reason: string | null;
  services: ServiceSnapshot[];
  lastChecks: CheckSnapshot[];
  incidents: IncidentSnapshot[];
  dailyStats: DailyStatSnapshot[];
}

export function emptySnapshot(
  fetchedAt: string,
  availability: Availability,
  reason: string | null
): StatusSnapshot {
  return {
    availability,
    fetchedAt,
    reason,
    services: [],
    lastChecks: [],
    incidents: [],
    dailyStats: [],
  };
}
