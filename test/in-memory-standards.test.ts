import { StandardsRequestError, ValidationError } from "@stndrds/client";
import { describe, expect, it } from "vitest";
import { check, service } from "../src/standards/schema";
import { createInMemoryStandards } from "./in-memory-standards";

describe("createInMemoryStandards", () => {
  it("filters with is / is_not and sorts", async () => {
    const memory = createInMemoryStandards();
    memory.seed("services", { name: "API", url: "https://a", enabled: true, position: 2 });
    memory.seed("services", { name: "Docs", url: "https://d", enabled: false, position: 1 });
    memory.seed("services", { name: "Web", url: "https://w", enabled: true, position: 0 });

    const enabled = await memory.standards
      .from(service)
      .eq("enabled", true)
      .orderBy("position")
      .fetch();
    expect(enabled.records.map((r) => r.name)).toEqual(["Web", "API"]);
    expect(enabled.total).toBe(2);

    const notWeb = await memory.standards.from(service).neq("name", "Web").fetch();
    expect(notWeb.records.map((r) => r.name)).toEqual(["API", "Docs"]);
  });

  it("compares dates as ISO strings and revives them", async () => {
    const memory = createInMemoryStandards();
    const serviceId = memory.seed("services", { name: "API", url: "https://a", enabled: true });
    memory.seed("checks", { service: serviceId, ok: true, checkedAt: "2026-09-01T00:00:00.000Z" });
    memory.seed("checks", { service: serviceId, ok: false, checkedAt: "2026-09-03T00:00:00.000Z" });

    const old = await memory.standards
      .from(check)
      .lt("checkedAt", "2026-09-02T00:00:00.000Z")
      .fetch();
    expect(old.records.length).toBe(1);
    expect(old.records[0]?.ok).toBe(true);

    const latest = await memory.standards.from(check).orderBy("checkedAt", "desc").single();
    expect(latest?.checkedAt).toEqual(new Date("2026-09-03T00:00:00.000Z"));
  });

  it("creates, updates and deletes", async () => {
    const memory = createInMemoryStandards();
    const created = await memory.standards.from(service).create({ name: "API", url: "https://a" });
    expect(memory.records("services").length).toBe(1);
    await memory.standards.from(service).update(created.id, { name: "API v2" });
    expect(memory.records("services")[0]?.values.name).toBe("API v2");
    await memory.standards.from(service).delete(created.id);
    expect(memory.records("services")).toEqual([]);
  });

  it("supports any_of and the empty checks", async () => {
    const memory = createInMemoryStandards();
    memory.seed("services", { name: "A", url: "https://a", position: 1 });
    memory.seed("services", { name: "B", url: "https://b" });
    const some = await memory.standards.from(service).in("name", ["A", "Z"]).fetch();
    expect(some.records.map((r) => r.name)).toEqual(["A"]);
    const noPosition = await memory.standards.from(service).isEmpty("position").fetch();
    expect(noPosition.records.map((r) => r.name)).toEqual(["B"]);
  });

  it("pages like the API: 20 by default, 100 at most", async () => {
    const memory = createInMemoryStandards();
    for (let i = 0; i < 130; i++) memory.seed("services", { name: `S${i}`, url: "https://s" });
    const byDefault = await memory.standards.from(service).fetch();
    expect(byDefault.records.length).toBe(20);
    expect(byDefault.total).toBe(130);
    const capped = await memory.standards.from(service).limit(500).fetch();
    expect(capped.records.length).toBe(100);
    const rest = await memory.standards.from(service).limit(100).offset(100).fetch();
    expect(rest.records.length).toBe(30);
  });

  it("rejects an operator it does not implement", async () => {
    const memory = createInMemoryStandards();
    await expect(
      memory.standards.from(service).contains("name", "x").fetch()
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws the injected error once", async () => {
    const memory = createInMemoryStandards();
    memory.failNextRequestWith(new StandardsRequestError(0, "Could not connect"));
    await expect(memory.standards.from(service).fetch()).rejects.toBeInstanceOf(
      StandardsRequestError
    );
    expect((await memory.standards.from(service).fetch()).records).toEqual([]);
  });
});
