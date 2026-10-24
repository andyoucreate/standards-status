import { BundleConflictError, BundleValidationError, ValidationError } from "@stndrds/client";
import { describe, expect, it } from "vitest";
import { syncSchema } from "./sync-schema";

describe("syncSchema", () => {
  it("returns 0 when the bundle is applied or unchanged", async () => {
    expect(
      await syncSchema({ bundles: { sync: async () => ({ applied: true, hash: "h" }) } })
    ).toBe(0);
    expect(
      await syncSchema({ bundles: { sync: async () => ({ applied: false, hash: "h" }) } })
    ).toBe(0);
  });

  it("returns 1 on a conflict or a rejected definition", async () => {
    const conflict = new BundleConflictError(
      409,
      'Object "services" is owned by core',
      "SCHEMA_CONFLICT"
    );
    expect(
      await syncSchema({
        bundles: {
          sync: async () => {
            throw conflict;
          },
        },
      })
    ).toBe(1);
    const rejected = new BundleValidationError(400, "bad", "SCHEMA_VALIDATION_FAILED");
    expect(
      await syncSchema({
        bundles: {
          sync: async () => {
            throw rejected;
          },
        },
      })
    ).toBe(1);
  });

  it("propagates any other error", async () => {
    await expect(
      syncSchema({
        bundles: {
          sync: async () => {
            throw new ValidationError("x", []);
          },
        },
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
