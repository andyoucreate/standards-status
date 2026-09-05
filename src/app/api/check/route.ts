import { revalidateTag } from "next/cache";
import { createCheckHandler } from "@/check/create-check-handler";
import { runChecks } from "@/check/run-checks";
import { getStandards } from "@/standards/client";
import { fetchSnapshot } from "@/status/fetch-snapshot";
import { STATUS_CACHE_TAG } from "@/status/load-status";
import { getSnapshotStore } from "@/status/snapshot-store";

const handler = createCheckHandler({
  cronSecret: process.env.CRON_SECRET,
  run: () => runChecks({ standards: getStandards(), now: () => new Date() }),
  snapshot: () => fetchSnapshot(getStandards(), new Date()),
  store: getSnapshotStore(),
  revalidate: () => revalidateTag(STATUS_CACHE_TAG, "max"),
});

export async function GET(request: Request): Promise<Response> {
  return handler(request);
}
