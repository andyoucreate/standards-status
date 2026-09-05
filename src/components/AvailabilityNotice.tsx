import { formatUtc } from "../lib/dates";
import type { StatusView } from "../status/derive";
import { SCHEMA_MISSING } from "../status/resolve-status";
import { toneClasses } from "./classes";

export function AvailabilityNotice({
  view,
}: {
  view: Pick<StatusView, "availability" | "fetchedAt" | "reason">;
}) {
  if (view.availability === "live") return null;
  const classes = toneClasses("blue").banner;
  if (view.availability === "stale") {
    return (
      <p className={`rounded-lg px-4 py-3 text-sm ${classes}`}>
        Live data unavailable — showing status as of {formatUtc(view.fetchedAt)}
      </p>
    );
  }
  if (view.reason === SCHEMA_MISSING) {
    return (
      <section className={`rounded-lg px-6 py-6 ${classes}`}>
        <h2 className="text-base font-semibold">This workspace is not set up yet</h2>
        <p className="mt-1 text-sm">
          The Standards workspace answers, but the status objects do not exist. Run{" "}
          <code className="font-mono text-xs">pnpm schema:sync</code> once with this workspace's API
          key; the page picks it up within a minute.
        </p>
      </section>
    );
  }
  return (
    <section className={`rounded-lg px-6 py-6 ${classes}`}>
      <h2 className="text-base font-semibold">Status data temporarily unavailable</h2>
      <p className="mt-1 text-sm">
        We could not reach our data source and have no earlier snapshot to show. This page retries
        every minute.
      </p>
    </section>
  );
}
