import { describe, expect, it } from "vitest";
import { dayKey, daysAgo, formatRelative, formatUtc, minutesBetween, toIso } from "./dates";

const now = new Date("2026-09-05T17:42:00.000Z");

describe("dates", () => {
  it("dayKey is the UTC calendar day", () => {
    expect(dayKey(new Date("2026-09-05T23:59:59.000Z"))).toBe("2026-09-05");
    expect(dayKey(new Date("2026-09-06T00:00:00.000Z"))).toBe("2026-09-06");
  });

  it("daysAgo subtracts whole days", () => {
    expect(daysAgo(now, 90).toISOString()).toBe("2026-06-07T17:42:00.000Z");
  });

  it("minutesBetween rounds to the minute", () => {
    expect(minutesBetween("2026-09-02T10:00:00.000Z", "2026-09-02T10:42:20.000Z")).toBe(42);
  });

  it("formatRelative", () => {
    expect(formatRelative("2026-09-05T17:41:22.000Z", now)).toBe("38 seconds ago");
    expect(formatRelative("2026-09-05T17:30:00.000Z", now)).toBe("12 minutes ago");
    expect(formatRelative("2026-09-05T15:42:00.000Z", now)).toBe("2 hours ago");
    expect(formatRelative("2026-09-02T17:42:00.000Z", now)).toBe("3 days ago");
  });

  it("formatUtc", () => {
    expect(formatUtc("2026-09-05T14:32:10.000Z")).toBe("2026-09-05 14:32 UTC");
  });
});

describe("dates boundaries", () => {
  it("formatRelative floors at bucket edges", () => {
    expect(formatRelative("2026-09-05T17:41:00.400Z", now)).toBe("59 seconds ago");
    expect(formatRelative("2026-09-05T16:42:20.000Z", now)).toBe("59 minutes ago");
    expect(formatRelative("2026-09-04T17:52:00.000Z", now)).toBe("23 hours ago");
  });

  it("toIso normalizes strings and dates", () => {
    expect(toIso("2026-09-05T17:42:00Z")).toBe("2026-09-05T17:42:00.000Z");
    expect(toIso(new Date("2026-09-05T17:42:00.000Z"))).toBe("2026-09-05T17:42:00.000Z");
  });
});
