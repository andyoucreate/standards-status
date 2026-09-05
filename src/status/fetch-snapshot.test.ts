import { describe, expect, it } from "vitest";
import { createInMemoryStandards } from "../../test/in-memory-standards";
import { fetchSnapshot } from "./fetch-snapshot";

const now = new Date("2026-09-05T17:42:00.000Z");

describe("fetchSnapshot", () => {
  it("reads every daily stat, not only the API's first page", async () => {
    const memory = createInMemoryStandards();
    const api = memory.seed("services", { name: "API", url: "https://a", enabled: true });
    for (let i = 0; i < 45; i++) {
      memory.seed("daily-stats", {
        service: api,
        day: `2026-08-${String((i % 30) + 1).padStart(2, "0")}`,
        total: 1,
        failed: 0,
      });
    }
    const snapshot = await fetchSnapshot(memory.standards, now);
    expect(snapshot.dailyStats.length).toBe(45);
  });

  it("projects enabled services, last checks, incidents with updates and recent stats", async () => {
    const memory = createInMemoryStandards();
    const api = memory.seed("services", {
      name: "API",
      url: "https://a",
      enabled: true,
      position: 1,
    });
    memory.seed("services", { name: "Off", url: "https://o", enabled: false });
    memory.seed("checks", {
      service: api,
      ok: true,
      statusCode: 200,
      latencyMs: 90,
      checkedAt: "2026-09-05T17:30:00.000Z",
    });
    memory.seed("checks", {
      service: api,
      ok: false,
      statusCode: 503,
      latencyMs: 900,
      checkedAt: "2026-09-05T17:35:00.000Z",
    });
    const open = memory.seed("incidents", {
      title: "Latency",
      status: "identified",
      impact: "major",
      services: [api],
      startedAt: "2026-09-05T17:00:00.000Z",
      resolvedAt: null,
    });
    memory.seed("incidents", {
      title: "Old",
      status: "resolved",
      impact: "minor",
      services: [api],
      startedAt: "2026-08-01T00:00:00.000Z",
      resolvedAt: "2026-08-01T01:00:00.000Z",
    });
    const recent = memory.seed("incidents", {
      title: "Recent",
      status: "resolved",
      impact: "minor",
      services: [api],
      startedAt: "2026-09-01T00:00:00.000Z",
      resolvedAt: "2026-09-01T00:30:00.000Z",
    });
    const u1 = memory.seed("incident-updates", {
      incident: open,
      status: "identified",
      message: "Found it",
      postedAt: "2026-09-05T17:20:00.000Z",
    });
    memory.seed("incident-updates", {
      incident: recent,
      status: "resolved",
      message: "Fixed",
      postedAt: "2026-09-01T00:30:00.000Z",
    });
    memory.seed("daily-stats", {
      service: api,
      day: "2026-09-05",
      total: 10,
      failed: 1,
      responded: 10,
      avgLatencyMs: 100,
    });
    memory.seed("daily-stats", {
      service: api,
      day: "2026-05-01",
      total: 10,
      failed: 0,
      responded: 10,
      avgLatencyMs: 100,
    });

    const snapshot = await fetchSnapshot(memory.standards, now);

    expect(snapshot.availability).toBe("live");
    expect(snapshot.fetchedAt).toBe("2026-09-05T17:42:00.000Z");
    expect(snapshot.services).toEqual([{ id: api, name: "API", position: 1 }]);
    expect(snapshot.lastChecks).toEqual([
      {
        serviceId: api,
        ok: false,
        statusCode: 503,
        latencyMs: 900,
        checkedAt: "2026-09-05T17:35:00.000Z",
      },
    ]);
    expect(snapshot.incidents.map((i) => i.id).sort()).toEqual([open, recent].sort());
    const openIncident = snapshot.incidents.find((i) => i.id === open);
    expect(openIncident?.updates).toEqual([
      { id: u1, status: "identified", message: "Found it", postedAt: "2026-09-05T17:20:00.000Z" },
    ]);
    expect(snapshot.dailyStats).toEqual([
      { serviceId: api, day: "2026-09-05", total: 10, failed: 1, avgLatencyMs: 100 },
    ]);
  });
});
