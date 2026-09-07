import { describe, expect, it } from "vitest";
import { startLocalServer } from "../../test/local-server";
import { warmStatusPage } from "./warm";

describe("warmStatusPage", () => {
  it("requests the page root, whatever the origin carried", async () => {
    const server = await startLocalServer();
    await warmStatusPage(`${server.url}/api/check?cron=1`);
    await server.close();
    expect(server.requests).toEqual(["/"]);
  });

  it("swallows an unreachable deployment rather than failing the run", async () => {
    await expect(warmStatusPage("http://127.0.0.1:1")).resolves.toBeUndefined();
  });
});
