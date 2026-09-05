import { StandardsRequestError } from "@stndrds/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createInMemoryStandards } from "../../test/in-memory-standards";
import { type LocalServer, startLocalServer } from "../../test/local-server";
import { runChecks } from "./run-checks";

let server: LocalServer;
beforeAll(async () => {
  server = await startLocalServer();
});
afterAll(() => server.close());

const now = () => new Date("2026-09-05T17:42:00.000Z");

describe("runChecks", () => {
  it("pings enabled services, writes one check each and counts up/down", async () => {
    const memory = createInMemoryStandards();
    const okId = memory.seed("services", {
      name: "Web",
      url: `${server.url}/ok`,
      enabled: true,
      expectedStatus: 200,
    });
    const failId = memory.seed("services", {
      name: "API",
      url: `${server.url}/fail`,
      enabled: true,
      expectedStatus: 200,
    });
    memory.seed("services", { name: "Off", url: `${server.url}/ok`, enabled: false });

    const result = await runChecks({ standards: memory.standards, now });

    expect(result).toEqual({ checked: 2, up: 1, down: 1, writeErrors: 0, purged: 0 });
    const checks = memory.records("checks").map((r) => r.values);
    expect(checks.length).toBe(2);
    const failing = checks.find((c) => c.service === failId);
    expect(failing?.ok).toBe(false);
    expect(failing?.statusCode).toBe(500);
    expect(failing?.checkedAt).toBe("2026-09-05T17:42:00.000Z");
    const passing = checks.find((c) => c.service === okId);
    expect(passing?.ok).toBe(true);
    expect(passing).not.toHaveProperty("error");
  });

  it("defaults expectedStatus to 200", async () => {
    const memory = createInMemoryStandards();
    memory.seed("services", { name: "Web", url: `${server.url}/ok`, enabled: true });
    const result = await runChecks({ standards: memory.standards, now });
    expect(result.up).toBe(1);
  });

  it("upserts one daily-stats record per service and day", async () => {
    const memory = createInMemoryStandards();
    const id = memory.seed("services", { name: "API", url: `${server.url}/fail`, enabled: true });

    await runChecks({ standards: memory.standards, now });
    await runChecks({ standards: memory.standards, now });

    const stats = memory.records("daily-stats").map((r) => r.values);
    expect(stats.length).toBe(1);
    expect(stats[0]?.service).toBe(id);
    expect(stats[0]?.day).toBe("2026-09-05");
    expect(stats[0]?.total).toBe(2);
    expect(stats[0]?.failed).toBe(2);
    expect(stats[0]?.responded).toBe(2);
    const [a, b] = memory.records("checks").map((r) => Number(r.values.latencyMs));
    expect(stats[0]?.avgLatencyMs).toBe(Math.round(((a ?? 0) + (b ?? 0)) / 2));
  });

  it("excludes timeouts from responded and the latency mean", async () => {
    const memory = createInMemoryStandards();
    memory.seed("services", { name: "Hang", url: `${server.url}/hang`, enabled: true });
    await runChecks({ standards: memory.standards, now, timeoutMs: 200 });
    const stat = memory.records("daily-stats")[0]?.values;
    expect(stat?.total).toBe(1);
    expect(stat?.failed).toBe(1);
    expect(stat?.responded).toBe(0);
    expect(stat).not.toHaveProperty("avgLatencyMs");
    const check = memory.records("checks")[0]?.values;
    expect(check).not.toHaveProperty("statusCode");
    expect(String(check?.error).startsWith("TimeoutError")).toBe(true);
  });

  it("one failing write does not block the others and is counted", async () => {
    const memory = createInMemoryStandards();
    memory.seed("services", { name: "Web", url: `${server.url}/ok`, enabled: true });
    memory.seed("services", { name: "Docs", url: `${server.url}/ok`, enabled: true });
    memory.failNextRequestWith(new StandardsRequestError(500, "boom"), /\/records\/checks$/);

    const result = await runChecks({ standards: memory.standards, now });

    expect(result).toEqual({ checked: 2, up: 2, down: 0, writeErrors: 1, purged: 0 });
    expect(memory.records("checks").length).toBe(1);
    expect(memory.records("daily-stats").length).toBe(1);
  });

  it("purges checks older than the retention and keeps younger ones", async () => {
    const memory = createInMemoryStandards();
    const id = memory.seed("services", { name: "Web", url: `${server.url}/ok`, enabled: true });
    memory.seed("checks", { service: id, ok: true, checkedAt: "2026-08-28T17:00:00.000Z" }); // 8 days
    memory.seed("checks", { service: id, ok: true, checkedAt: "2026-08-30T18:00:00.000Z" }); // 6 days

    const result = await runChecks({ standards: memory.standards, now });

    expect(result.purged).toBe(1);
    const remaining = memory.records("checks").map((r) => r.values.checkedAt);
    expect(remaining).toEqual(["2026-08-30T18:00:00.000Z", "2026-09-05T17:42:00.000Z"]);
  });

  it("propagates a Standards failure while reading services", async () => {
    const memory = createInMemoryStandards();
    memory.failNextRequestWith(new StandardsRequestError(0, "down"));
    await expect(runChecks({ standards: memory.standards, now })).rejects.toMatchObject({
      status: 0,
    });
  });
});
