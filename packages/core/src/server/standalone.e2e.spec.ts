import { describe, expect, it, suite, beforeAll, afterAll } from "vitest";
import { createSrpcServer } from "./standalone";
import {
  appRouterTest,
  appRouterWithContext,
  type TestContext,
} from "../test/test-router";
import { getPort } from "get-port-please";
import type { Server } from "node:http";

// Run sequentially to avoid port conflicts
suite.sequential("createSrpcServer", () => {
  describe("[E2E] - basic server (no context)", () => {
    let server: Server;
    let port: number;
    let baseUrl: string;

    beforeAll(async () => {
      port = await getPort();
      baseUrl = `http://localhost:${port}`;
      server = createSrpcServer({
        router: appRouterTest,
        endpoint: "/api",
      });
      await new Promise<void>((resolve) => server.listen(port, resolve));
    });

    afterAll(
      () =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        })
    );

    it("should return 405 for GET requests", async () => {
      const res = await fetch(`${baseUrl}/api/sayHello`, {
        method: "GET",
      });

      expect(res.status).toBe(405);
    });

    it("should return 405 for PUT requests", async () => {
      const res = await fetch(`${baseUrl}/api/sayHello`, {
        method: "PUT",
        body: JSON.stringify(["Test"]),
      });

      expect(res.status).toBe(405);
    });

    it("should accept POST requests", async () => {
      const res = await fetch(`${baseUrl}/api/sayHello`, {
        method: "POST",
        body: JSON.stringify(["World"]),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toBe("Hello World");
    });

    it("should handle simple procedure call", async () => {
      const res = await fetch(`${baseUrl}/api/sayHello`, {
        method: "POST",
        body: JSON.stringify(["Node"]),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toBe("Hello Node");
    });

    it("should handle nested router call", async () => {
      const res = await fetch(`${baseUrl}/api/users.getUser`, {
        method: "POST",
        body: JSON.stringify([42]),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ id: 42 });
    });

    it("should return error status for failing procedure", async () => {
      const res = await fetch(`${baseUrl}/api/failingProcedure`, {
        method: "POST",
        body: JSON.stringify([]),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("This always fails");
    });

    it("should handle batch requests via node server", async () => {
      const res = await fetch(`${baseUrl}/api/_batch`, {
        method: "POST",
        body: JSON.stringify({
          requests: [
            { id: 1, path: "sayHello", args: ["Batch1"] },
            { id: 2, path: "sayHello", args: ["Batch2"] },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.responses).toHaveLength(2);
      expect(body.responses[0].data).toBe("Hello Batch1");
      expect(body.responses[1].data).toBe("Hello Batch2");
    });
  });

  describe("[E2E] - context from IncomingMessage", () => {
    let server: Server;
    let port: number;
    let baseUrl: string;

    beforeAll(async () => {
      port = await getPort();
      baseUrl = `http://localhost:${port}`;
      server = createSrpcServer({
        router: appRouterWithContext,
        endpoint: "/api",
        createContext: async (req): Promise<TestContext> => {
          const userId = req.headers["x-user-id"];
          return {
            userId: Array.isArray(userId) ? userId[0] : userId ?? "anonymous",
          };
        },
      });
      await new Promise<void>((resolve) => server.listen(port, resolve));
      // Small delay to ensure server is fully ready
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    afterAll(
      () =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        })
    );

    it("should pass context from headers to procedure", async () => {
      const res = await fetch(`${baseUrl}/api/whoami`, {
        method: "POST",
        body: JSON.stringify([]),
        headers: { "x-user-id": "node-user-456" },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toBe("node-user-456");
    });

    it("should use default when header missing", async () => {
      const res = await fetch(`${baseUrl}/api/whoami`, {
        method: "POST",
        body: JSON.stringify([]),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toBe("anonymous");
    });
  });
});
