import { describe, expect, it } from "vitest";
import { liveSnapshot, majorIncident, NOW, resolvedIncident } from "../../test/fixtures";
import { deriveStatusView } from "./derive";
import type { IncidentSnapshot } from "./snapshot";

describe("deriveStatusView banner", () => {
  it("is green when every last check is ok", () => {
    const view = deriveStatusView(liveSnapshot(), NOW);
    expect(view.banner).toEqual({ tone: "green", message: "All systems operational" });
  });

  it("takes the strongest open incident", () => {
    const minor: IncidentSnapshot = {
      ...majorIncident,
      id: "inc-2",
      title: "Slow docs",
      impact: "minor",
      serviceIds: ["svc-web"],
    };
    const view = deriveStatusView(liveSnapshot({ incidents: [minor, majorIncident] }), NOW);
    expect(view.banner).toEqual({
      tone: "orange",
      message: "Partial outage — Elevated API latency (Major)",
    });
  });

  it("is degraded when a last check failed and no incident is open", () => {
    const snapshot = liveSnapshot();
    snapshot.lastChecks = snapshot.lastChecks.map((c) =>
      c.serviceId === "svc-api" ? { ...c, ok: false, statusCode: 502 } : c
    );
    expect(deriveStatusView(snapshot, NOW).banner).toEqual({
      tone: "orange",
      message: "Degraded performance detected",
    });
  });

  it("is gray without services", () => {
    const view = deriveStatusView(
      liveSnapshot({ services: [], lastChecks: [], dailyStats: [] }),
      NOW
    );
    expect(view.banner).toEqual({ tone: "gray", message: "No services configured yet" });
  });

  it("ignores resolved incidents", () => {
    const resolved = {
      ...majorIncident,
      status: "resolved" as const,
      resolvedAt: "2026-09-05T17:40:00.000Z",
    };
    expect(deriveStatusView(liveSnapshot({ incidents: [resolved] }), NOW).banner.tone).toBe(
      "green"
    );
  });
});

describe("deriveStatusView services", () => {
  it("orders by position and derives tone from the last check", () => {
    const snapshot = liveSnapshot();
    snapshot.lastChecks = snapshot.lastChecks.map((c) =>
      c.serviceId === "svc-web" ? { ...c, ok: false } : c
    );
    const view = deriveStatusView(snapshot, NOW);
    expect(view.services.map((s) => s.name)).toEqual(["Website", "API"]);
    expect(view.services[0]?.tone).toBe("red");
    expect(view.services[1]?.tone).toBe("green");
    expect(view.services[1]?.latencyMs).toBe(96);
  });

  it("lets an open incident override the check tone", () => {
    const view = deriveStatusView(liveSnapshot({ incidents: [majorIncident] }), NOW);
    expect(view.services[1]?.tone).toBe("orange");
    expect(view.services[0]?.tone).toBe("green");
  });

  it("is gray without any check", () => {
    const view = deriveStatusView(liveSnapshot({ lastChecks: [] }), NOW);
    expect(view.services[0]?.tone).toBe("gray");
    expect(view.services[0]?.latencyMs).toBe(null);
  });

  it("builds 90 day segments, oldest first, with threshold tones", () => {
    const snapshot = liveSnapshot();
    const web = (day: string, failed: number) => {
      const stat = snapshot.dailyStats.find((s) => s.serviceId === "svc-web" && s.day === day);
      if (stat) stat.failed = failed;
    };
    web("2026-09-05", 2); // 0.69 % → green
    web("2026-09-04", 3); // 1.04 % → yellow
    web("2026-09-03", 14); // 4.86 % → yellow
    web("2026-09-02", 15); // 5.2 % → red
    snapshot.dailyStats = snapshot.dailyStats.filter(
      (s) => !(s.serviceId === "svc-web" && s.day === "2026-09-01")
    );

    const days = deriveStatusView(snapshot, NOW).services[0]?.days ?? [];
    expect(days.length).toBe(90);
    expect(days[0]?.day).toBe("2026-06-08");
    expect(days[89]).toEqual({ day: "2026-09-05", tone: "green", failureRatio: 2 / 288 });
    expect(days[88]?.tone).toBe("yellow");
    expect(days[87]?.tone).toBe("yellow");
    expect(days[86]?.tone).toBe("red");
    expect(days[85]).toEqual({ day: "2026-09-01", tone: "gray", failureRatio: null });
  });

  it("switches tone exactly at 1 % and 5 %", () => {
    const snapshot = liveSnapshot({
      services: [{ id: "svc-a", name: "A", position: 0 }],
      lastChecks: [],
      dailyStats: [
        { serviceId: "svc-a", day: "2026-09-05", total: 1000, failed: 9, avgLatencyMs: null },
        { serviceId: "svc-a", day: "2026-09-04", total: 100, failed: 1, avgLatencyMs: null },
        { serviceId: "svc-a", day: "2026-09-03", total: 1000, failed: 49, avgLatencyMs: null },
        { serviceId: "svc-a", day: "2026-09-02", total: 100, failed: 5, avgLatencyMs: null },
      ],
    });
    const days = deriveStatusView(snapshot, NOW).services[0]?.days ?? [];
    expect(days.slice(86).map((d) => d.tone)).toEqual(["red", "yellow", "yellow", "green"]);
  });

  it("computes uptime over the window and dashes it without data", () => {
    const snapshot = liveSnapshot();
    for (const stat of snapshot.dailyStats) if (stat.serviceId === "svc-api") stat.failed = 1;
    const view = deriveStatusView(snapshot, NOW);
    expect(view.services[1]?.uptimePercent).toBe("99.65");
    expect(view.services[0]?.uptimePercent).toBe("100.00");
    const empty = deriveStatusView(liveSnapshot({ dailyStats: [] }), NOW);
    expect(empty.services[0]?.uptimePercent).toBe("—");
  });
});

describe("deriveStatusView incidents", () => {
  it("renders active incidents with labels, service names and updates newest first", () => {
    const [incident] = deriveStatusView(
      liveSnapshot({ incidents: [majorIncident] }),
      NOW
    ).activeIncidents;
    expect(incident?.statusLabel).toBe("Identified");
    expect(incident?.statusTone).toBe("orange");
    expect(incident?.impactLabel).toBe("Major");
    expect(incident?.serviceNames).toEqual(["API"]);
    expect(incident?.updates.map((u) => u.id)).toEqual(["u2", "u1"]);
    expect(incident?.updates[0]?.paragraphs).toEqual(["Pool saturated.", "Scaling out."]);
    expect(incident?.updates[0]?.statusLabel).toBe("Identified");
  });

  it("groups resolved incidents of the last 14 days by day with their duration", () => {
    const old = {
      ...resolvedIncident,
      id: "inc-old",
      startedAt: "2026-08-10T10:00:00.000Z",
      resolvedAt: "2026-08-10T11:00:00.000Z",
    };
    const view = deriveStatusView(
      liveSnapshot({ incidents: [resolvedIncident, old, majorIncident] }),
      NOW
    );
    expect(view.pastIncidents).toEqual([
      {
        day: "2026-09-02",
        incidents: [
          {
            id: "inc-r",
            title: "Elevated API latency",
            durationMinutes: 42,
            resolvedAt: "2026-09-02T10:42:00.000Z",
          },
        ],
      },
    ]);
  });
});
