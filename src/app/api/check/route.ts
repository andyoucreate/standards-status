import { revalidateTag } from "next/cache";
import { connection } from "next/server";
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

/** `connection()` pins the route to request time: it must never be prerendered into a static 401/500. */
export async function GET(request: Request): Promise<Response> {
  await connection();
  return handler(request);
}
