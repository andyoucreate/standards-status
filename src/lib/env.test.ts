import { StandardsConfigurationError } from "@stndrds/client";
import { afterEach, describe, expect, it } from "vitest";
import { requireEnv } from "./env";

describe("requireEnv", () => {
  afterEach(() => {
    delete process.env.STATUS_TEST_VAR;
  });

  it("returns the value when set", () => {
    process.env.STATUS_TEST_VAR = "hello";
    expect(requireEnv("STATUS_TEST_VAR")).toBe("hello");
  });

  it("throws StandardsConfigurationError when missing or empty", () => {
    process.env.STATUS_TEST_VAR = "";
    const error = (() => {
      try {
        requireEnv("STATUS_TEST_VAR");
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(StandardsConfigurationError);
    expect((error as Error).message).toBe("Missing environment variable STATUS_TEST_VAR");
  });
});
