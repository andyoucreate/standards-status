import { createStandards, type Standards } from "@stndrds/client";
import { requireEnv } from "../lib/env";

/** The read/write surface the app depends on; the in-memory test transport satisfies it too. */
export type StandardsRecords = Pick<Standards, "from">;

let instance: Standards | null = null;

export function getStandards(): Standards {
  if (!instance) {
    instance = createStandards({
      baseUrl: requireEnv("STANDARDS_API_URL"),
      apiKey: requireEnv("STANDARDS_API_KEY"),
    });
  }
  return instance;
}
