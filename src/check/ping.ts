export interface PingResult {
  ok: boolean;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/** One GET with redirects followed; a thrown error (timeout, DNS, refused) is a failed check with no status. */
export async function pingUrl(
  url: string,
  expectedStatus: number,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch
): Promise<PingResult> {
  const startedAt = performance.now();
  const elapsed = () => Math.round(performance.now() - startedAt);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return {
      ok: response.status === expectedStatus,
      statusCode: response.status,
      latencyMs: elapsed(),
      error: null,
    };
  } catch (error) {
    return { ok: false, statusCode: null, latencyMs: elapsed(), error: describeError(error) };
  }
}
