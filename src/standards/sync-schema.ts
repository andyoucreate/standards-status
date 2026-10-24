import {
  BundleConflictError,
  BundleValidationError,
  type Standards,
  StandardsAuthError,
} from "@stndrds/client";
import { createLogger, errorFields } from "../lib/logger";
import { statusBundle } from "./schema";

const log = createLogger("schema.sync");

/** Pushes the bundle; 0 on applied/unchanged, 1 on a conflict, a rejected definition or a refused key. */
export async function syncSchema(standards: Pick<Standards, "bundles">): Promise<number> {
  try {
    const result = await standards.bundles.sync(statusBundle);
    log.info(result.applied ? "schema.applied" : "schema.unchanged", { hash: result.hash });
    return 0;
  } catch (error) {
    if (error instanceof BundleConflictError) {
      log.error("schema.conflict", {
        objectName: error.objectName,
        owner: error.owner,
        ...errorFields(error),
      });
      return 1;
    }
    if (error instanceof BundleValidationError || error instanceof StandardsAuthError) {
      log.error("schema.rejected", errorFields(error));
      return 1;
    }
    throw error;
  }
}
