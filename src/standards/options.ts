export type Tone = "green" | "yellow" | "orange" | "red" | "blue" | "gray";

/** The subset of the SDK's `Option` shape this app uses; `Option` itself is not re-exported by `@stndrds/client`. */
interface StatusOption {
  value: string;
  label: string;
  color: Tone;
  group?: "idle" | "in_progress" | "finished";
}

export const INCIDENT_STATUS_OPTIONS = [
  { value: "investigating", label: "Investigating", color: "red", group: "in_progress" },
  { value: "identified", label: "Identified", color: "orange", group: "in_progress" },
  { value: "monitoring", label: "Monitoring", color: "blue", group: "in_progress" },
  { value: "resolved", label: "Resolved", color: "green", group: "finished" },
] as const satisfies readonly StatusOption[];

export const IMPACT_OPTIONS = [
  { value: "none", label: "None", color: "gray" },
  { value: "minor", label: "Minor", color: "yellow" },
  { value: "major", label: "Major", color: "orange" },
  { value: "critical", label: "Critical", color: "red" },
] as const satisfies readonly StatusOption[];

export type IncidentStatus = (typeof INCIDENT_STATUS_OPTIONS)[number]["value"];
export type Impact = (typeof IMPACT_OPTIONS)[number]["value"];

export const IMPACT_RANK: Record<Impact, number> = { none: 0, minor: 1, major: 2, critical: 3 };

const STATUS_BY_VALUE = new Map(INCIDENT_STATUS_OPTIONS.map((o) => [o.value, o] as const));
const IMPACT_BY_VALUE = new Map(IMPACT_OPTIONS.map((o) => [o.value, o] as const));

export function isIncidentStatus(value: unknown): value is IncidentStatus {
  return typeof value === "string" && STATUS_BY_VALUE.has(value as IncidentStatus);
}

export function isImpact(value: unknown): value is Impact {
  return typeof value === "string" && IMPACT_BY_VALUE.has(value as Impact);
}

export function incidentStatusLabel(status: IncidentStatus): string {
  return STATUS_BY_VALUE.get(status)?.label ?? status;
}

export function incidentStatusTone(status: IncidentStatus): Tone {
  return STATUS_BY_VALUE.get(status)?.color ?? "gray";
}

export function impactLabel(impact: Impact): string {
  return IMPACT_BY_VALUE.get(impact)?.label ?? impact;
}

export function impactTone(impact: Impact): Tone {
  return IMPACT_BY_VALUE.get(impact)?.color ?? "gray";
}
