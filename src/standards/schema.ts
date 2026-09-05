import {
  checkbox,
  date,
  defineSchemaSource,
  listView,
  number,
  object,
  relation,
  richtext,
  select,
  status,
  text,
} from "@stndrds/client";
import { IMPACT_OPTIONS, INCIDENT_STATUS_OPTIONS } from "./options";

export const service = object({ name: "services", label: "Service" })
  .icon("globe")
  .attribute(text({ name: "name", label: "Name" }).required())
  .attribute(text({ name: "url", label: "URL" }).url().required())
  .attribute(number({ name: "expectedStatus", label: "Expected HTTP status" }).defaultValue(200))
  .attribute(number({ name: "position", label: "Position" }))
  .attribute(checkbox({ name: "enabled", label: "Enabled" }).defaultValue(true))
  .attribute(
    relation({ name: "incidents", label: "Incidents" })
      .to("incidents")
      .many()
      .bilateral({ object: "incidents", attribute: "services" })
  )
  .labelExpression("{{ name }}");

export const check = object({ name: "checks", label: "Check" })
  .icon("activity")
  .attribute(relation({ name: "service", label: "Service" }).to("services").required())
  .attribute(checkbox({ name: "ok", label: "OK" }))
  .attribute(number({ name: "statusCode", label: "HTTP status" }))
  .attribute(number({ name: "latencyMs", label: "Latency (ms)" }))
  .attribute(text({ name: "error", label: "Error" }))
  .attribute(date({ name: "checkedAt", label: "Checked at" }).includeTime().required())
  .labelExpression("{{ checkedAt }}");

export const dailyStat = object({ name: "daily-stats", label: "Daily stat" })
  .icon("chart-bar")
  .attribute(relation({ name: "service", label: "Service" }).to("services").required())
  .attribute(date({ name: "day", label: "Day" }).required())
  .attribute(number({ name: "total", label: "Checks" }))
  .attribute(number({ name: "failed", label: "Failed" }))
  .attribute(number({ name: "responded", label: "Responded" }))
  .attribute(number({ name: "avgLatencyMs", label: "Average latency (ms)" }))
  .labelExpression("{{ day }}");

export const incident = object({ name: "incidents", label: "Incident" })
  .icon("flame")
  .attribute(text({ name: "title", label: "Title" }).required())
  .attribute(
    status({ name: "status", label: "Status" }).options(INCIDENT_STATUS_OPTIONS).required()
  )
  .attribute(select({ name: "impact", label: "Impact" }).options(IMPACT_OPTIONS).required())
  .attribute(
    relation({ name: "services", label: "Affected services" })
      .to("services")
      .many()
      .bilateral({ object: "services", attribute: "incidents" })
  )
  .attribute(date({ name: "startedAt", label: "Started at" }).includeTime().required())
  .attribute(date({ name: "resolvedAt", label: "Resolved at" }).includeTime())
  .labelExpression("{{ title }}");

export const incidentUpdate = object({ name: "incident-updates", label: "Incident update" })
  .icon("message")
  .attribute(relation({ name: "incident", label: "Incident" }).to("incidents").required())
  .attribute(status({ name: "status", label: "Status" }).options(INCIDENT_STATUS_OPTIONS))
  .attribute(richtext({ name: "message", label: "Message" }).required())
  .attribute(date({ name: "postedAt", label: "Posted at" }).includeTime().required())
  .labelExpression("{{ postedAt }}");

const views = [
  listView("services", "Services")
    .for("services")
    .tab("all", "All")
    .columns("name", "url", "enabled", "position", "expectedStatus")
    .sort("position", "asc")
    .done()
    .default()
    .build(),
  listView("checks", "Checks")
    .for("checks")
    .tab("recent", "Recent")
    .columns("checkedAt", "service", "ok", "statusCode", "latencyMs", "error")
    .sort("checkedAt", "desc")
    .done()
    .default()
    .build(),
  listView("daily-stats", "Daily stats")
    .for("daily-stats")
    .tab("all", "All")
    .columns("day", "service", "total", "failed", "avgLatencyMs")
    .sort("day", "desc")
    .done()
    .default()
    .build(),
  listView("incidents", "Incidents")
    .for("incidents")
    .tab("all", "All")
    .columns("title", "status", "impact", "services", "startedAt", "resolvedAt")
    .sort("startedAt", "desc")
    .done()
    .default()
    .build(),
  listView("incident-updates", "Incident updates")
    .for("incident-updates")
    .tab("all", "All")
    .columns("postedAt", "incident", "status", "message")
    .sort("postedAt", "desc")
    .done()
    .default()
    .build(),
];

export const statusSource = defineSchemaSource("status", {
  objects: [service, check, dailyStat, incident, incidentUpdate],
  views,
});

/**
 * The SDK infers a many-relation record value as `string | undefined` (it has no
 * cardinality branch); at runtime the REST API returns an array of record ids.
 * Every consumer reads a many-relation through this narrowing accessor.
 */
export function relatedIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}
