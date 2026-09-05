import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type LocalServer, startLocalServer } from "../../test/local-server";
import { pingUrl } from "./ping";

let server: LocalServer;
beforeAll(async () => {
  server = await startLocalServer();
});
afterAll(() => server.close());

describe("pingUrl", () => {
  it("is ok when the status matches", async () => {
    const result = await pingUrl(`${server.url}/ok`, 200, 1000);
    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.error).toBe(null);
    expect(Number.isInteger(result.latencyMs)).toBe(true);
    expect(result.latencyMs).toBeLessThan(1000);
  });

  it("is not ok when the status differs", async () => {
    const result = await pingUrl(`${server.url}/fail`, 200, 1000);
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.error).toBe(null);
  });

  it("reports a timeout with no status code", async () => {
    const result = await pingUrl(`${server.url}/hang`, 200, 200);
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(null);
    expect(result.error?.startsWith("TimeoutError")).toBe(true);
  });

  it("reports a connection failure", async () => {
    const result = await pingUrl("http://127.0.0.1:1/", 200, 1000);
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(null);
    expect(result.error?.startsWith("TypeError")).toBe(true);
  });
});
