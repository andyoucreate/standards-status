import { getStandards } from "../src/standards/client";
import { syncSchema } from "../src/standards/sync-schema";

process.exitCode = await syncSchema(getStandards());
