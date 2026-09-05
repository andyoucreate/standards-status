import { formatUtc } from "../lib/dates";
import type { StatusView } from "../status/derive";
import { toneClasses } from "./tone-classes";

export function AvailabilityNotice({
  view,
}: {
  view: Pick<StatusView, "availability" | "fetchedAt">;
}) {
  if (view.availability === "live") return null;
  const classes = toneClasses("blue").banner;
  if (view.availability === "stale") {
    return (
      <p className={`rounded-md px-4 py-2 text-sm ${classes}`}>
        Live data unavailable — showing status as of {formatUtc(view.fetchedAt)}
      </p>
    );
  }
  return (
    <section className={`rounded-lg px-5 py-6 ${classes}`}>
      <h2 className="text-base font-semibold">Status data temporarily unavailable</h2>
      <p className="mt-1 text-sm">
        We could not reach our data source and have no earlier snapshot to show. This page retries
        every minute.
      </p>
    </section>
  );
}
