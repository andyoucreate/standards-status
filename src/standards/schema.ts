import {
  checkbox,
  date,
  defineSchemaSource,
  detailView,
  type FilterState,
  group,
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
  .pluralLabel("Services")
  .icon("globe")
  .description("A URL the status page pings every five minutes.")
  .attribute(text({ name: "name", label: "Name" }).icon("globe").required())
  .attribute(
    text({ name: "url", label: "URL" })
      .url()
      .icon("link")
      .description("Pinged with a GET; redirects are followed.")
      .required()
  )
  .attribute(
    number({ name: "expectedStatus", label: "Expected HTTP status" })
      .icon("hash")
      .description("The check passes when the response status equals this value.")
      .defaultValue(200)
  )
  .attribute(
    number({ name: "position", label: "Position" })
      .icon("list-check")
      .description("Display order on the public page, lowest first.")
  )
  .attribute(
    checkbox({ name: "enabled", label: "Enabled" })
      .icon("check-square")
      .description("Uncheck to pause the checks without deleting the history.")
      .defaultValue(true)
  )
  .attribute(
    relation({ name: "incidents", label: "Incidents" })
      .to("incidents")
      .many()
      .bilateral({ object: "incidents", attribute: "services" })
      .icon("flame")
  )
  .labelExpression("{{ name }}");

export const check = object({ name: "checks", label: "Check" })
  .pluralLabel("Checks")
  .icon("activity")
  .description("One ping result. Written by the status page, kept for seven days.")
  .attribute(
    relation({ name: "service", label: "Service" }).to("services").icon("globe").required()
  )
  .attribute(checkbox({ name: "ok", label: "OK" }).icon("check-square"))
  .attribute(number({ name: "statusCode", label: "HTTP status" }).icon("hash"))
  .attribute(number({ name: "latencyMs", label: "Latency (ms)" }).icon("activity"))
  .attribute(
    text({ name: "error", label: "Error" })
      .icon("flame")
      .description("Set only when the request failed before getting a response.")
  )
  .attribute(
    date({ name: "checkedAt", label: "Checked at" }).includeTime().icon("clock-circle").required()
  )
  .labelExpression("{{ checkedAt }}");

export const dailyStat = object({ name: "daily-stats", label: "Daily stat" })
  .pluralLabel("Daily stats")
  .icon("chart-bar")
  .description("One row per service and UTC day, feeding the 90-day uptime bars.")
  .attribute(
    relation({ name: "service", label: "Service" }).to("services").icon("globe").required()
  )
  .attribute(date({ name: "day", label: "Day" }).icon("calendar").required())
  .attribute(number({ name: "total", label: "Checks" }).icon("hash"))
  .attribute(number({ name: "failed", label: "Failed" }).icon("flame"))
  .attribute(number({ name: "responded", label: "Responded" }).icon("hash"))
  .attribute(number({ name: "avgLatencyMs", label: "Average latency (ms)" }).icon("activity"))
  .labelExpression("{{ day }}");

export const incident = object({ name: "incidents", label: "Incident" })
  .pluralLabel("Incidents")
  .icon("flame")
  .description("Something you are working on. Shown on the public page until resolved.")
  .attribute(text({ name: "title", label: "Title" }).icon("flame").required())
  .attribute(
    status({ name: "status", label: "Status" })
      .options(INCIDENT_STATUS_OPTIONS)
      .description("Investigating, identified and monitoring are open; resolved closes it.")
      .required()
  )
  .attribute(
    select({ name: "impact", label: "Impact" })
      .options(IMPACT_OPTIONS)
      .icon("star")
      .description("Colors the public banner and the affected services.")
      .required()
  )
  .attribute(
    relation({ name: "services", label: "Affected services" })
      .to("services")
      .many()
      .bilateral({ object: "services", attribute: "incidents" })
      .icon("globe")
  )
  .attribute(
    date({ name: "startedAt", label: "Started at" }).includeTime().icon("clock-circle").required()
  )
  .attribute(
    date({ name: "resolvedAt", label: "Resolved at" })
      .includeTime()
      .icon("check-circle")
      .description("Set when the status becomes resolved; drives the 14-day history.")
  )
  .labelExpression("{{ title }}");

export const incidentUpdate = object({ name: "incident-updates", label: "Incident update" })
  .pluralLabel("Incident updates")
  .icon("message")
  .description("A dated message in an incident's timeline, newest first on the public page.")
  .attribute(
    relation({ name: "incident", label: "Incident" }).to("incidents").icon("flame").required()
  )
  .attribute(
    status({ name: "status", label: "Status" })
      .options(INCIDENT_STATUS_OPTIONS)
      .description("The incident status at the time of this update.")
  )
  .attribute(richtext({ name: "message", label: "Message" }).icon("message").required())
  .attribute(
    date({ name: "postedAt", label: "Posted at" }).includeTime().icon("clock-circle").required()
  )
  .labelExpression("{{ postedAt }}");

const isTrue = (attribute: string): FilterState => ({
  combinator: "and",
  rules: [{ attribute, operator: "is", value: true }],
});
const isFalse = (attribute: string): FilterState => ({
  combinator: "and",
  rules: [{ attribute, operator: "is", value: false }],
});
const statusIs = (value: string, operator: "is" | "is_not" = "is"): FilterState => ({
  combinator: "and",
  rules: [{ attribute: "status", operator, value }],
});

const listViews = [
  listView("services", "Services")
    .for("services")
    .icon("globe")
    .tab("enabled", "Monitored")
    .icon("check-square")
    .filter(isTrue("enabled"))
    .columns("name", "url", "expectedStatus", "position", "incidents")
    .sort("position", "asc")
    .default()
    .tab("paused", "Paused")
    .filter(isFalse("enabled"))
    .columns("name", "url", "position")
    .sort("position", "asc")
    .tab("all", "All")
    .columns("name", "url", "enabled", "expectedStatus", "position", "incidents")
    .sort("position", "asc")
    .done()
    .default()
    .build(),
  listView("checks", "Checks")
    .for("checks")
    .icon("activity")
    .tab("recent", "Recent")
    .columns("checkedAt", "service", "ok", "statusCode", "latencyMs")
    .sort("checkedAt", "desc")
    .default()
    .tab("failures", "Failures")
    .icon("flame")
    .filter(isFalse("ok"))
    .columns("checkedAt", "service", "statusCode", "error", "latencyMs")
    .sort("checkedAt", "desc")
    .done()
    .default()
    .build(),
  listView("daily-stats", "Daily stats")
    .for("daily-stats")
    .icon("chart-bar")
    .tab("recent", "Recent")
    .columns("day", "service", "total", "failed", "avgLatencyMs")
    .sort("day", "desc")
    .default()
    .tab("with-failures", "With failures")
    .icon("flame")
    .filter({
      combinator: "and",
      rules: [{ attribute: "failed", operator: "greater_than", value: 0 }],
    })
    .columns("day", "service", "failed", "total", "avgLatencyMs")
    .sort("day", "desc")
    .done()
    .default()
    .build(),
  listView("incidents", "Incidents")
    .for("incidents")
    .icon("flame")
    .tab("board", "Board")
    .kanban("status")
    .kanbanColumnOrder(["investigating", "identified", "monitoring", "resolved"])
    .cardDateAttribute("startedAt")
    .columns("title", "impact", "services", "startedAt")
    .sort("startedAt", "desc")
    .default()
    .tab("open", "Open")
    .icon("flame")
    .filter(statusIs("resolved", "is_not"))
    .columns("title", "status", "impact", "services", "startedAt")
    .sort("startedAt", "desc")
    .tab("resolved", "Resolved")
    .icon("check-circle")
    .filter(statusIs("resolved"))
    .columns("title", "impact", "services", "startedAt", "resolvedAt")
    .sort("resolvedAt", "desc")
    .tab("all", "All")
    .columns("title", "status", "impact", "services", "startedAt", "resolvedAt")
    .sort("startedAt", "desc")
    .done()
    .default()
    .build(),
  listView("incident-updates", "Incident updates")
    .for("incident-updates")
    .icon("message")
    .tab("timeline", "Timeline")
    .columns("postedAt", "incident", "status", "message")
    .sort("postedAt", "desc")
    .default()
    .done()
    .default()
    .build(),
];

const detailViews = [
  detailView("services-detail", "Service")
    .for("services")
    .icon("globe")
    .default()
    .tab("general", "General")
    .form(
      group("monitoring", "Monitoring")
        .field("name")
        .field("url")
        .field("expectedStatus")
        .field("enabled"),
      group("display", "Public page").field("position")
    )
    .tab("incidents", "Incidents")
    .tableFrom("incidents", "services")
    .columns("title", "status", "impact", "startedAt", "resolvedAt")
    .sort("startedAt", "desc")
    .tab("checks", "Checks")
    .tableFrom("checks", "service")
    .columns("checkedAt", "ok", "statusCode", "latencyMs", "error")
    .sort("checkedAt", "desc")
    .tab("stats", "Daily stats")
    .tableFrom("daily-stats", "service")
    .columns("day", "total", "failed", "avgLatencyMs")
    .sort("day", "desc")
    .build(),
  detailView("incidents-detail", "Incident")
    .for("incidents")
    .icon("flame")
    .default()
    .tab("general", "General")
    .form(
      group("incident", "Incident")
        .field("title")
        .field("status")
        .field("impact")
        .field("services"),
      group("timeline", "Timeline").field("startedAt").field("resolvedAt")
    )
    .tab("updates", "Updates")
    .tableFrom("incident-updates", "incident")
    .columns("postedAt", "status", "message")
    .crud()
    .sort("postedAt", "desc")
    .build(),
];

const views = [...listViews, ...detailViews];

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
