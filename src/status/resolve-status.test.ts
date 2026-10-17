import { StandardsAuthError, StandardsRequestError, ValidationError } from "@stndrds/client";
import { describe, expect, it } from "vitest";
import { liveSnapshot, NOW } from "../../test/fixtures";
import {
  createMemoryOutboxStore,
  createMemorySnapshotStore,
} from "../../test/memory-snapshot-store";
import { isStandardsUnreachable, resolveStatus } from "./resolve-status";
import { createBlobSnapshotStore } from "./snapshot-store";

const now = NOW;

describe("resolveStatus", () => {
  it("returns the live snapshot when Standards answers", async () => {
    const store = createMemorySnapshotStore();
    const snapshot = await resolveStatus({
      fetchSnapshot: async () => liveSnapshot(),
      store,
      outbox: createMemoryOutboxStore(),
      now,
    });
    expect(snapshot.availability).toBe("live");
    expect(snapshot.services.length).toBe(2);
  });

  it("is unavailable when Standards is unreachable and nothing was stored", async () => {
    const store = createMemorySnapshotStore();
    const snapshot = await resolveStatus({
      fetchSnapshot: async () => {
        throw new StandardsRequestError(0, "Could not connect");
      },
      store,
      outbox: createMemoryOutboxStore(),
      now,
    });
    expect(snapshot.availability).toBe("unavailable");
    expect(snapshot.reason).toBe("unreachable");
    expect(snapshot.fetchedAt).toBe("2026-09-05T17:42:00.000Z");
    expect(snapshot.services).toEqual([]);
  });

  it("serves the stored snapshot as stale when Standards is unreachable", async () => {
    const store = createMemorySnapshotStore();
    await store.save(liveSnapshot({ fetchedAt: "2026-09-05T14:32:00.000Z" }));
    const snapshot = await resolveStatus({
      fetchSnapshot: async () => {
        throw new StandardsRequestError(503, "Service unavailable");
      },
      store,
      outbox: createMemoryOutboxStore(),
      now,
    });
    expect(snapshot.availability).toBe("stale");
    expect(snapshot.reason).toBe("unreachable");
    expect(snapshot.fetchedAt).toBe("2026-09-05T14:32:00.000Z");
    expect(snapshot.services.map((s) => s.name)).toEqual(["Website", "API"]);
  });

  it("lays the pings taken during the outage over the stale snapshot", async () => {
    const store = createMemorySnapshotStore();
    await store.save(liveSnapshot({ fetchedAt: "2026-09-05T14:32:00.000Z" }));
    const outbox = createMemoryOutboxStore();
    const down = { ok: false, statusCode: 503, latencyMs: 40, error: null };
    await outbox.save({
      targets: [],
      latest: [{ serviceId: "svc-api", ...down, checkedAt: "2026-09-05T17:40:00.000Z" }],
      pending: [
        { serviceId: "svc-api", ...down, checkedAt: "2026-09-05T17:35:00.000Z", counted: false },
        { serviceId: "svc-api", ...down, checkedAt: "2026-09-05T17:40:00.000Z", counted: false },
        { serviceId: "svc-api", ...down, checkedAt: "2026-09-05T17:30:00.000Z", counted: true },
      ],
    });
    const snapshot = await resolveStatus({
      fetchSnapshot: async () => {
        throw new StandardsRequestError(0, "Could not connect");
      },
      store,
      outbox,
      now,
    });
    expect(snapshot.availability).toBe("stale");
    expect(snapshot.fetchedAt).toBe("2026-09-05T17:40:00.000Z");
    const api = snapshot.lastChecks.find((c) => c.serviceId === "svc-api");
    expect(api?.ok).toBe(false);
    expect(api?.checkedAt).toBe("2026-09-05T17:40:00.000Z");
    expect(snapshot.lastChecks.find((c) => c.serviceId === "svc-web")?.ok).toBe(true);
    const today = snapshot.dailyStats.find(
      (s) => s.serviceId === "svc-api" && s.day === "2026-09-05"
    );
    expect(today?.total).toBe(290);
    expect(today?.failed).toBe(2);
  });

  it("names an auth failure by the server code, or 'auth' without one", async () => {
    const store = createMemorySnapshotStore();
    const coded = await resolveStatus({
      fetchSnapshot: async () => {
        throw new StandardsAuthError(401, "Unauthorized", "SCHEMA_FORBIDDEN");
      },
      store,
      outbox: createMemoryOutboxStore(),
      now,
    });
    expect(coded.availability).toBe("unavailable");
    expect(coded.reason).toBe("SCHEMA_FORBIDDEN");
    const bare = await resolveStatus({
      fetchSnapshot: async () => {
        throw new StandardsAuthError(401, "Unauthorized");
      },
      store,
      outbox: createMemoryOutboxStore(),
      now,
    });
    expect(bare.reason).toBe("auth");
  });

  it("propagates any other error", async () => {
    const store = createMemorySnapshotStore();
    await expect(
      resolveStatus({
        fetchSnapshot: async () => {
          throw new ValidationError("bad", []);
        },
        store,
        outbox: createMemoryOutboxStore(),
        now,
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("createBlobSnapshotStore without a token", () => {
  it("saves nothing and loads null", async () => {
    const store = createBlobSnapshotStore(undefined);
    await store.save(liveSnapshot());
    expect(await store.load()).toBe(null);
  });
});

describe("resolveStatus on an unsynced workspace", () => {
  it("is unavailable with reason schema_missing and ignores any stored snapshot", async () => {
    const store = createMemorySnapshotStore();
    await store.save(liveSnapshot({ fetchedAt: "2026-09-05T14:32:00.000Z" }));
    const snapshot = await resolveStatus({
      fetchSnapshot: async () => {
        throw new StandardsRequestError(
          404,
          'Object "services" not found',
          "SCHEMA_OBJECT_NOT_FOUND"
        );
      },
      store,
      outbox: createMemoryOutboxStore(),
      now: NOW,
    });
    expect(snapshot.availability).toBe("unavailable");
    expect(snapshot.reason).toBe("schema_missing");
    expect(snapshot.services).toEqual([]);
  });

  it("still propagates a 404 wrapped in an auth error as auth, and any other 4xx as an error", async () => {
    const store = createMemorySnapshotStore();
    await expect(
      resolveStatus({
        fetchSnapshot: async () => {
          throw new StandardsRequestError(422, "bad filter", "SCHEMA_VALIDATION_FAILED");
        },
        store,
        outbox: createMemoryOutboxStore(),
        now: NOW,
      })
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe("isStandardsUnreachable", () => {
  it("is true for status 0, 5xx and auth errors, false for a 4xx request error", () => {
    expect(isStandardsUnreachable(new StandardsRequestError(0, "x"))).toBe(true);
    expect(isStandardsUnreachable(new StandardsRequestError(502, "x"))).toBe(true);
    expect(isStandardsUnreachable(new StandardsAuthError(403, "x"))).toBe(true);
    expect(isStandardsUnreachable(new StandardsRequestError(404, "x"))).toBe(false);
    expect(isStandardsUnreachable(new ValidationError("x", []))).toBe(false);
  });
});
