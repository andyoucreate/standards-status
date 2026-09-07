import { describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag,
}));

const { revalidateStatus, STATUS_CACHE_TAG } = await import("./load-status");

describe("revalidateStatus", () => {
  it("expires the status entry instead of allowing a stale one to be served", () => {
    revalidateStatus();
    expect(revalidateTag).toHaveBeenCalledWith(STATUS_CACHE_TAG, { expire: 0 });
  });
});
