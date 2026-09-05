import { dayKey, daysAgo, minutesBetween } from "../lib/dates";
import {
  IMPACT_RANK,
  type Impact,
  impactLabel,
  impactTone,
  incidentStatusLabel,
  incidentStatusTone,
  type Tone,
} from "../standards/options";
import type { Availability, IncidentSnapshot, StatusSnapshot } from "./snapshot";

export interface BannerView {
  tone: Tone;
  message: string;
}
export interface DayView {
  day: string;
  tone: Tone;
  failureRatio: number | null;
}
export interface ServiceRowView {
  id: string;
  name: string;
  tone: Tone;
  latencyMs: number | null;
  days: DayView[];
  uptimePercent: string;
}
export interface UpdateView {
  id: string;
  statusLabel: string | null;
  paragraphs: string[];
  postedAt: string;
}
export interface IncidentView {
  id: string;
  title: string;
  statusLabel: string;
  statusTone: Tone;
  impactLabel: string;
  impactTone: Tone;
  serviceNames: string[];
  startedAt: string;
  updates: UpdateView[];
}
export interface PastIncidentView {
  id: string;
  title: string;
  durationMinutes: number;
  resolvedAt: string;
}
export interface PastIncidentDayView {
  day: string;
  incidents: PastIncidentView[];
}
export interface StatusView {
  availability: Availability;
  fetchedAt: string;
  reason: string | null;
  banner: BannerView;
  activeIncidents: IncidentView[];
  services: ServiceRowView[];
  pastIncidents: PastIncidentDayView[];
}

const HISTORY_DAYS = 90;
const RESOLVED_WINDOW_DAYS = 14;
const YELLOW_RATIO = 0.01;
const RED_RATIO = 0.05;

const IMPACT_HEADLINE: Record<Impact, string> = {
  none: "Incident reported",
  minor: "Minor service disruption",
  major: "Partial outage",
  critical: "Major outage",
};

function strongest(incidents: IncidentSnapshot[]): IncidentSnapshot | null {
  return incidents.reduce<IncidentSnapshot | null>(
    (best, candidate) =>
      !best || IMPACT_RANK[candidate.impact] > IMPACT_RANK[best.impact] ? candidate : best,
    null
  );
}

function dayTone(ratio: number | null): Tone {
  if (ratio === null) return "gray";
  if (ratio < YELLOW_RATIO) return "green";
  if (ratio < RED_RATIO) return "yellow";
  return "red";
}

function paragraphs(markdown: string): string[] {
  return markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

function deriveBanner(snapshot: StatusSnapshot, open: IncidentSnapshot[]): BannerView {
  const worst = strongest(open);
  if (worst) {
    return {
      tone: impactTone(worst.impact),
      message: `${IMPACT_HEADLINE[worst.impact]} — ${worst.title} (${impactLabel(worst.impact)})`,
    };
  }
  if (snapshot.lastChecks.some((c) => !c.ok)) {
    return { tone: "orange", message: "Degraded performance detected" };
  }
  if (snapshot.services.length === 0)
    return { tone: "gray", message: "No services configured yet" };
  return { tone: "green", message: "All systems operational" };
}

function serviceTone(incident: IncidentSnapshot | null, lastCheck: { ok: boolean } | null): Tone {
  if (incident) return impactTone(incident.impact);
  if (!lastCheck) return "gray";
  return lastCheck.ok ? "green" : "red";
}

function deriveServices(
  snapshot: StatusSnapshot,
  open: IncidentSnapshot[],
  now: Date
): ServiceRowView[] {
  const window = Array.from({ length: HISTORY_DAYS }, (_, i) =>
    dayKey(daysAgo(now, HISTORY_DAYS - 1 - i))
  );
  const sorted = [...snapshot.services].sort(
    (a, b) => a.position - b.position || a.name.localeCompare(b.name)
  );
  return sorted.map((service) => {
    const incidentOnService = strongest(open.filter((i) => i.serviceIds.includes(service.id)));
    const lastCheck = snapshot.lastChecks.find((c) => c.serviceId === service.id) ?? null;
    const stats = snapshot.dailyStats.filter((s) => s.serviceId === service.id);
    const days = window.map((day) => {
      const stat = stats.find((s) => s.day === day);
      const ratio = stat && stat.total > 0 ? stat.failed / stat.total : null;
      return { day, tone: dayTone(ratio), failureRatio: ratio };
    });
    const total = stats.reduce((sum, s) => sum + s.total, 0);
    const failed = stats.reduce((sum, s) => sum + s.failed, 0);
    return {
      id: service.id,
      name: service.name,
      tone: serviceTone(incidentOnService, lastCheck),
      latencyMs: lastCheck?.latencyMs ?? null,
      days,
      uptimePercent: total === 0 ? "—" : ((1 - failed / total) * 100).toFixed(2),
    };
  });
}

function deriveActiveIncidents(snapshot: StatusSnapshot, open: IncidentSnapshot[]): IncidentView[] {
  const nameById = new Map(snapshot.services.map((s) => [s.id, s.name]));
  return open.map((i) => ({
    id: i.id,
    title: i.title,
    statusLabel: incidentStatusLabel(i.status),
    statusTone: incidentStatusTone(i.status),
    impactLabel: impactLabel(i.impact),
    impactTone: impactTone(i.impact),
    serviceNames: i.serviceIds.flatMap((id) => {
      const name = nameById.get(id);
      return name === undefined ? [] : [name];
    }),
    startedAt: i.startedAt,
    updates: [...i.updates]
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
      .map((u) => ({
        id: u.id,
        statusLabel: u.status ? incidentStatusLabel(u.status) : null,
        paragraphs: paragraphs(u.message),
        postedAt: u.postedAt,
      })),
  }));
}

type ResolvedIncident = IncidentSnapshot & { resolvedAt: string };

function derivePastIncidents(snapshot: StatusSnapshot, now: Date): PastIncidentDayView[] {
  const since = daysAgo(now, RESOLVED_WINDOW_DAYS).toISOString();
  const resolved = snapshot.incidents
    .filter(
      (i): i is ResolvedIncident =>
        i.status === "resolved" && i.resolvedAt !== null && i.resolvedAt >= since
    )
    .sort((a, b) => b.resolvedAt.localeCompare(a.resolvedAt));
  const groups = new Map<string, PastIncidentView[]>();
  for (const i of resolved) {
    const day = i.resolvedAt.slice(0, 10);
    const list = groups.get(day) ?? [];
    list.push({
      id: i.id,
      title: i.title,
      durationMinutes: minutesBetween(i.startedAt, i.resolvedAt),
      resolvedAt: i.resolvedAt,
    });
    groups.set(day, list);
  }
  return [...groups.entries()].map(([day, incidents]) => ({ day, incidents }));
}

/** Pure: every display rule of the status page lives here. */
export function deriveStatusView(snapshot: StatusSnapshot, now: Date): StatusView {
  const open = snapshot.incidents.filter((i) => i.status !== "resolved");
  return {
    availability: snapshot.availability,
    fetchedAt: snapshot.fetchedAt,
    reason: snapshot.reason,
    banner: deriveBanner(snapshot, open),
    activeIncidents: deriveActiveIncidents(snapshot, open),
    services: deriveServices(snapshot, open, now),
    pastIncidents: derivePastIncidents(snapshot, now),
  };
}
