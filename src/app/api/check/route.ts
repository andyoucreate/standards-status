import { after, connection } from "next/server";
import { createCheckHandler } from "@/check/create-check-handler";
import { runChecks } from "@/check/run-checks";
import { getStandards } from "@/standards/client";
import { fetchSnapshot } from "@/status/fetch-snapshot";
import { revalidateStatus } from "@/status/load-status";
import { getSnapshotStore } from "@/status/snapshot-store";
import { warmStatusPage } from "@/status/warm";

const handler = createCheckHandler({
  cronSecret: process.env.CRON_SECRET,
  run: () => runChecks({ standards: getStandards(), now: () => new Date() }),
  snapshot: () => fetchSnapshot(getStandards(), new Date()),
  store: getSnapshotStore(),
  revalidate: revalidateStatus,
  warm: (origin) => after(() => warmStatusPage(origin)),
});

/** `connection()` pins the route to request time: it must never be prerendered into a static 401/500. */
export async function GET(request: Request): Promise<Response> {
  await connection();
  return handler(request);
}
