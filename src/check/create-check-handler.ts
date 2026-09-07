import { StandardsAuthError } from "@stndrds/client";
import { createLogger, errorFields } from "../lib/logger";
import { isSchemaMissing, isStandardsUnreachable, SCHEMA_MISSING } from "../status/resolve-status";
import type { StatusSnapshot } from "../status/snapshot";
import type { SnapshotStore } from "../status/snapshot-store";
import type { RunChecksResult } from "./run-checks";

export interface CheckHandlerDeps {
  cronSecret: string | undefined;
  run: () => Promise<RunChecksResult>;
  snapshot: () => Promise<StatusSnapshot>;
  store: SnapshotStore;
  revalidate: () => void;
  /** Called with the deployment's own origin once the entry has been expired. */
  warm: (origin: string) => void;
}

const log = createLogger("check.route");

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status });
}

/** Auth → run → snapshot → blob → revalidate → warm. Standards failures become HTTP statuses, never stack traces. */
export function createCheckHandler(
  deps: CheckHandlerDeps
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (!deps.cronSecret) {
      log.error("check.missing_cron_secret");
      return json(500, { error: "missing_cron_secret" });
    }
    if (request.headers.get("authorization") !== `Bearer ${deps.cronSecret}`) {
      return json(401, { error: "unauthorized" });
    }

    const startedAt = performance.now();
    let result: RunChecksResult;
    try {
      result = await deps.run();
    } catch (error) {
      if (error instanceof StandardsAuthError) {
        log.error("check.auth_failed", errorFields(error));
        return json(500, { error: error.code ?? "auth" });
      }
      if (isStandardsUnreachable(error)) {
        log.error("check.standards_unreachable", errorFields(error));
        return json(503, { error: "standards_unreachable" });
      }
      if (isSchemaMissing(error)) {
        log.error("check.schema_missing", errorFields(error));
        return json(503, { error: SCHEMA_MISSING });
      }
      throw error;
    }

    try {
      await deps.store.save(await deps.snapshot());
    } catch (error) {
      log.error("check.snapshot_save_failed", errorFields(error));
    }
    deps.revalidate();
    deps.warm(new URL(request.url).origin);

    const durationMs = Math.round(performance.now() - startedAt);
    log.info("check.completed", { ...result, durationMs });
    return json(200, { ...result, durationMs });
  };
}
