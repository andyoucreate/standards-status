import { createStandards } from "@stndrds/client";
import { requireEnv } from "../src/lib/env";
import { syncSchema } from "../src/standards/sync-schema";

const standards = createStandards({
  baseUrl: requireEnv("STANDARDS_API_URL"),
  apiKey: requireEnv("STANDARDS_API_KEY"),
});

process.exitCode = await syncSchema(standards);
