import { StandardsAuthError, StandardsRequestError, ValidationError } from "@stndrds/client";
import { describe, expect, it } from "vitest";
import { liveSnapshot, NOW } from "../../test/fixtures";
import { isStandardsUnreachable, resolveStatus } from "./resolve-status";
import { createBlobSnapshotStore, createMemorySnapshotStore } from "./snapshot-store";

const now = () => NOW;

describe("resolveStatus", () => {
  it("returns the live snapshot when Standards answers", async () => {
    const store = createMemorySnapshotStore();
    const snapshot = await resolveStatus({ fetchSnapshot: async () => liveSnapshot(), store, now });
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
      now,
    });
    expect(snapshot.availability).toBe("stale");
    expect(snapshot.reason).toBe("unreachable");
    expect(snapshot.fetchedAt).toBe("2026-09-05T14:32:00.000Z");
    expect(snapshot.services.map((s) => s.name)).toEqual(["Website", "API"]);
  });

  it("names an auth failure by the server code, or 'auth' without one", async () => {
    const store = createMemorySnapshotStore();
    const coded = await resolveStatus({
      fetchSnapshot: async () => {
        throw new StandardsAuthError(401, "Unauthorized", "SCHEMA_FORBIDDEN");
      },
      store,
      now,
    });
    expect(coded.availability).toBe("unavailable");
    expect(coded.reason).toBe("SCHEMA_FORBIDDEN");
    const bare = await resolveStatus({
      fetchSnapshot: async () => {
        throw new StandardsAuthError(401, "Unauthorized");
      },
      store,
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

describe("isStandardsUnreachable", () => {
  it("is true for status 0, 5xx and auth errors, false for a 4xx request error", () => {
    expect(isStandardsUnreachable(new StandardsRequestError(0, "x"))).toBe(true);
    expect(isStandardsUnreachable(new StandardsRequestError(502, "x"))).toBe(true);
    expect(isStandardsUnreachable(new StandardsAuthError(403, "x"))).toBe(true);
    expect(isStandardsUnreachable(new StandardsRequestError(404, "x"))).toBe(false);
    expect(isStandardsUnreachable(new ValidationError("x", []))).toBe(false);
  });
});
