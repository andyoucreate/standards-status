import { hashSchemaSource } from "@stndrds/client";
import { describe, expect, it } from "vitest";
import { IMPACT_OPTIONS, INCIDENT_STATUS_OPTIONS, impactTone, incidentStatusTone } from "./options";
import { relatedIds, statusSource } from "./schema";

describe("statusSource", () => {
  it("declares exactly the five status objects", () => {
    expect(statusSource.id).toBe("status");
    expect(statusSource.objects.map((o) => o.name)).toEqual([
      "services",
      "checks",
      "daily-stats",
      "incidents",
      "incident-updates",
    ]);
  });

  it("declares one default list view per object and detail views for services and incidents", () => {
    const listViews = statusSource.views.filter((v) => v.type === "list");
    expect(listViews.map((v) => [v.object, v.default])).toEqual([
      ["services", true],
      ["checks", true],
      ["daily-stats", true],
      ["incidents", true],
      ["incident-updates", true],
    ]);
    const detailViews = statusSource.views.filter((v) => v.type === "detail");
    expect(detailViews.map((v) => [v.object, v.default])).toEqual([
      ["services", true],
      ["incidents", true],
    ]);
  });

  it("boards incidents by status in the order of the lifecycle", () => {
    const incidents = statusSource.views.find((v) => v.type === "list" && v.object === "incidents");
    const tabs = (
      incidents as {
        config: {
          tabs: Array<{
            id: string;
            layout: string;
            groupByAttribute?: string;
            kanbanColumnOrder?: string[];
          }>;
        };
      }
    ).config.tabs;
    expect(tabs.map((t) => t.id)).toEqual(["board", "open", "resolved", "all"]);
    expect(tabs[0]?.layout).toBe("kanban");
    expect(tabs[0]?.groupByAttribute).toBe("status");
    expect(tabs[0]?.kanbanColumnOrder).toEqual([
      "investigating",
      "identified",
      "monitoring",
      "resolved",
    ]);
  });

  it("hashes deterministically", () => {
    const again = hashSchemaSource({ objects: statusSource.objects, views: statusSource.views });
    expect(again).toBe(statusSource.hash);
  });

  it("shares the status and impact options with the UI", () => {
    const incidents = statusSource.objects.find((o) => o.name === "incidents");
    const status = incidents?.attributes.find((a) => a.name === "status");
    const impact = incidents?.attributes.find((a) => a.name === "impact");
    expect(status?.type).toBe("status");
    expect((status as { options: unknown }).options).toEqual(INCIDENT_STATUS_OPTIONS);
    expect((impact as { options: unknown }).options).toEqual(IMPACT_OPTIONS);
    expect(incidentStatusTone("investigating")).toBe("red");
    expect(impactTone("critical")).toBe("red");
    expect(impactTone("none")).toBe("gray");
  });

  it("links incidents and services bilaterally", () => {
    const incidents = statusSource.objects.find((o) => o.name === "incidents");
    const services = incidents?.attributes.find((a) => a.name === "services") as {
      cardinality: string;
      bilateral: { object: string; attribute: string };
    };
    expect(services.cardinality).toBe("many");
    expect(services.bilateral).toEqual({ object: "services", attribute: "incidents" });
  });
});

describe("relatedIds", () => {
  it("narrows an array of ids and treats anything else as empty", () => {
    expect(relatedIds(["a", "b"])).toEqual(["a", "b"]);
    expect(relatedIds(["a", 1, null])).toEqual(["a"]);
    expect(relatedIds(undefined)).toEqual([]);
    expect(relatedIds("a")).toEqual([]);
  });
});
