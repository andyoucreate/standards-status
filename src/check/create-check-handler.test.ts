import { StandardsAuthError, StandardsRequestError } from "@stndrds/client";
import { describe, expect, it } from "vitest";
import { liveSnapshot, NOW } from "../../test/fixtures";
import { createInMemoryStandards } from "../../test/in-memory-standards";
import { createMemorySnapshotStore } from "../../test/memory-snapshot-store";
import { createCheckHandler } from "./create-check-handler";
import { runChecks } from "./run-checks";

const okRun = async () => ({ checked: 2, up: 2, down: 0, writeErrors: 0, purged: 0 });

function handlerWith(overrides: Partial<Parameters<typeof createCheckHandler>[0]> = {}) {
  const store = createMemorySnapshotStore();
  const calls = { revalidate: 0 };
  const handler = createCheckHandler({
    cronSecret: "s3cret",
    run: okRun,
    snapshot: async () => liveSnapshot(),
    store,
    revalidate: () => {
      calls.revalidate += 1;
    },
    ...overrides,
  });
  return { handler, store, calls };
}

const authorized = new Request("http://localhost/api/check", {
  headers: { authorization: "Bearer s3cret" },
});

describe("createCheckHandler", () => {
  it("rejects a missing or wrong bearer", async () => {
    const { handler } = handlerWith();
    const missing = await handler(new Request("http://localhost/api/check"));
    expect(missing.status).toBe(401);
    expect(await missing.json()).toEqual({ error: "unauthorized" });
    const wrong = await handler(
      new Request("http://localhost/api/check", { headers: { authorization: "Bearer nope" } })
    );
    expect(wrong.status).toBe(401);
  });

  it("refuses to run without a configured secret", async () => {
    const { handler } = handlerWith({ cronSecret: undefined });
    const response = await handler(authorized);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "missing_cron_secret" });
  });

  it("runs, saves the snapshot, revalidates and reports", async () => {
    const { handler, store, calls } = handlerWith();
    const response = await handler(authorized);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual([
      "checked",
      "down",
      "durationMs",
      "purged",
      "up",
      "writeErrors",
    ]);
    expect(body).toMatchObject({ checked: 2, up: 2, down: 0, writeErrors: 0, purged: 0 });
    expect(body.durationMs).toBeGreaterThanOrEqual(0);
    expect(store.current?.services.length).toBe(2);
    expect(calls.revalidate).toBe(1);
  });

  it("answers 503 and writes nothing when Standards is unreachable", async () => {
    const memory = createInMemoryStandards();
    memory.seed("services", { name: "Web", url: "http://127.0.0.1:1/", enabled: true });
    memory.failNextRequestWith(new StandardsRequestError(0, "Could not connect"));
    const { handler, store, calls } = handlerWith({
      run: () => runChecks({ standards: memory.standards, now: () => NOW }),
    });
    const response = await handler(authorized);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "standards_unreachable" });
    expect(memory.records("checks")).toEqual([]);
    expect(store.current).toBe(null);
    expect(calls.revalidate).toBe(0);
  });

  it("stays 200 when some writes failed", async () => {
    const { handler } = handlerWith({
      run: async () => ({ checked: 2, up: 2, down: 0, writeErrors: 1, purged: 0 }),
    });
    const response = await handler(authorized);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ writeErrors: 1 });
  });

  it("answers 503 schema_missing when the workspace was never synced", async () => {
    const { handler, calls } = handlerWith({
      run: async () => {
        throw new StandardsRequestError(
          404,
          'Object "services" not found',
          "SCHEMA_OBJECT_NOT_FOUND"
        );
      },
    });
    const response = await handler(authorized);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "schema_missing" });
    expect(calls.revalidate).toBe(0);
  });

  it("answers 500 with the code on an auth failure", async () => {
    const { handler } = handlerWith({
      run: async () => {
        throw new StandardsAuthError(403, "Forbidden", "SCHEMA_FORBIDDEN");
      },
    });
    const response = await handler(authorized);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "SCHEMA_FORBIDDEN" });
  });

  it("still answers 200 when the blob write fails", async () => {
    const { handler, calls } = handlerWith({
      store: {
        save: async () => {
          throw new TypeError("blob down");
        },
        load: async () => null,
      },
    });
    const response = await handler(authorized);
    expect(response.status).toBe(200);
    expect(calls.revalidate).toBe(1);
  });
});
