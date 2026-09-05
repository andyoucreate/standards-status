import { describe, expect, it } from "vitest";
import { createInMemoryStandards } from "../../test/in-memory-standards";
import { fetchAll } from "./paginate";
import { dailyStat } from "./schema";

describe("fetchAll", () => {
  it("walks every page past the API's 100-record cap", async () => {
    const memory = createInMemoryStandards();
    for (let i = 0; i < 250; i++) {
      memory.seed("daily-stats", {
        service: "svc",
        day: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
        total: i,
      });
    }
    const records = await fetchAll(
      memory.standards.from(dailyStat).eq("service", "svc").orderBy("total")
    );
    expect(records.length).toBe(250);
    expect(records[249]?.total).toBe(249);
  });
});
