import { createServer } from "node:http";

export interface LocalServer {
  url: string;
  close(): Promise<void>;
}

/** `/ok` answers 200, `/fail` answers 500, `/hang` never answers (to exercise timeouts). */
export async function startLocalServer(): Promise<LocalServer> {
  const server = createServer((request, response) => {
    if (request.url === "/hang") return;
    response.statusCode = request.url === "/fail" ? 500 : 200;
    response.end("ok");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
