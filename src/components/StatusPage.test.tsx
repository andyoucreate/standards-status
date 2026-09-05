import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { statusConfig } from "../../status.config";
import { liveSnapshot, NOW } from "../../test/fixtures";
import { deriveStatusView } from "../status/derive";
import { emptySnapshot } from "../status/snapshot";
import { StatusPage } from "./StatusPage";

function render(view: ReturnType<typeof deriveStatusView>): string {
  return renderToStaticMarkup(<StatusPage view={view} config={statusConfig} now={NOW} />);
}

describe("StatusPage", () => {
  it("renders the live page", () => {
    const html = render(deriveStatusView(liveSnapshot(), NOW));
    expect(html).toContain("All systems operational");
    expect(html).toContain("Website");
    expect(html).toContain("100.00%");
    expect(html).toContain("Running with Standards");
    expect(html).toContain("https://standards.new");
    expect(html).toContain("Updated 0 seconds ago");
    expect(html).not.toContain("Live data unavailable");
    expect(html).not.toContain("Past incidents");
  });

  it("renders an active incident with its updates", () => {
    const snapshot = liveSnapshot({
      incidents: [
        {
          id: "inc-1",
          title: "Elevated API latency",
          status: "identified",
          impact: "major",
          serviceIds: ["svc-api"],
          startedAt: "2026-09-05T17:08:00.000Z",
          resolvedAt: null,
          updates: [
            {
              id: "u1",
              status: "identified",
              message: "Pool saturated.\n\nScaling out.",
              postedAt: "2026-09-05T17:30:00.000Z",
            },
          ],
        },
      ],
    });
    const html = render(deriveStatusView(snapshot, NOW));
    expect(html).toContain("Partial outage — Elevated API latency (Major)");
    expect(html).toContain("Identified");
    expect(html).toContain(">Pool saturated.<");
    expect(html).toContain(">Scaling out.<");
    expect(html).not.toContain("<p>Pool saturated.\n\nScaling out.</p>");
    expect(html).toContain("12 minutes ago");
  });

  it("renders the stale notice with the snapshot time", () => {
    const view = deriveStatusView(
      liveSnapshot({
        availability: "stale",
        reason: "unreachable",
        fetchedAt: "2026-09-05T14:32:00.000Z",
      }),
      NOW
    );
    const html = render(view);
    expect(html).toContain("Live data unavailable — showing status as of 2026-09-05 14:32 UTC");
    expect(html).toContain("All systems operational");
  });

  it("renders the unavailable state without services", () => {
    const view = deriveStatusView(
      emptySnapshot(NOW.toISOString(), "unavailable", "unreachable"),
      NOW
    );
    const html = render(view);
    expect(html).toContain("Status data temporarily unavailable");
    expect(html).not.toContain("No services configured yet");
    expect(html).toContain("Running with Standards");
  });

  it("renders past incidents inside a collapsed details element", () => {
    const snapshot = liveSnapshot({
      incidents: [
        {
          id: "inc-r",
          title: "Scheduled database maintenance",
          status: "resolved",
          impact: "minor",
          serviceIds: ["svc-api"],
          startedAt: "2026-09-02T10:00:00.000Z",
          resolvedAt: "2026-09-02T10:42:00.000Z",
          updates: [],
        },
      ],
    });
    const html = render(deriveStatusView(snapshot, NOW));
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toContain("Scheduled database maintenance");
    expect(html).toContain("42 min");
  });
});
