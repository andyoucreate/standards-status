import { createLogger, errorFields } from "../lib/logger";

const log = createLogger("status");

/**
 * Rebuilds the page cache on the cron's own time. The run expires the status
 * entry, so without this the next visitor pays for the rebuild; requesting the
 * page once puts a fresh entry back before anyone asks for it.
 *
 * Must be scheduled with `after()`: Next flushes the pending revalidations only
 * once the route handler has returned, so a request made from inside the
 * handler would still be served — and would re-warm — the entry being expired.
 *
 * Never throws: a warm-up that fails only costs the next visitor a rebuild.
 */
export async function warmStatusPage(origin: string): Promise<void> {
  try {
    const response = await fetch(new URL("/", origin), { cache: "no-store" });
    // The body is what the rebuild produces; drain it so the entry is complete.
    await response.arrayBuffer();
    if (!response.ok) log.warn("status.warm_failed", { status: response.status });
  } catch (error) {
    log.warn("status.warm_failed", errorFields(error));
  }
}
