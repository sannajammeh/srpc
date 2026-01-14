import { describe, expect, it, suite } from "vitest";
import { srpcFetchApi } from "./fetch";
import {
  appRouterTest,
  appRouterWithContext,
  type TestContext,
} from "../test/test-router";

suite("srpcFetchApi", () => {
  describe("[E2E] - single requests", () => {
    const api = srpcFetchApi({
      router: appRouterTest,
      endpoint: "/api",
    });

    it("should handle simple procedure call", async () => {
      const req = new Request("http://localhost/api/sayHello", {
        method: "POST",
        body: JSON.stringify(["World"]),
      });

      const res = await api.fetch(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toBe("Hello World");
    });

    it("should handle nested router call", async () => {
      const req = new Request("http://localhost/api/users.getUser", {
        method: "POST",
        body: JSON.stringify([42]),
      });

      const res = await api.fetch(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        id: 42,
        name: "John Doe",
        email: "john@doe.com",
      });
    });

    it("should handle deeply nested router call", async () => {
      const req = new Request("http://localhost/api/users.admin.createUser", {
        method: "POST",
        body: JSON.stringify([99]),
      });

      const res = await api.fetch(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ id: 99 });
    });
  });

  describe("[E2E] - error handling", () => {
    const api = srpcFetchApi({
      router: appRouterTest,
      endpoint: "/api",
    });

    it("should return 400 for BAD_REQUEST SRPCError", async () => {
      const req = new Request("http://localhost/api/failingProcedure", {
        method: "POST",
        body: JSON.stringify([]),
      });

      const res = await api.fetch(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("This always fails");
      expect(body.code).toBe("BAD_REQUEST");
    });

    it("should return 404 for unknown procedure", async () => {
      const req = new Request("http://localhost/api/nonexistent", {
        method: "POST",
        body: JSON.stringify([]),
      });

      const res = await api.fetch(req);

      expect(res.status).toBe(404);
    });
  });

  describe("[E2E] - context creation", () => {
    it("should pass context from createContext to procedure", async () => {
      const api = srpcFetchApi({
        router: appRouterWithContext,
        endpoint: "/api",
        createContext: async (req): Promise<TestContext> => {
          const userId = req.headers.get("x-user-id") ?? "anonymous";
          return { userId };
        },
      });

      const req = new Request("http://localhost/api/whoami", {
        method: "POST",
        body: JSON.stringify([]),
        headers: { "x-user-id": "user-123" },
      });

      const res = await api.fetch(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toBe("user-123");
    });
  });

  describe("[E2E] - batch endpoint", () => {
    const api = srpcFetchApi({
      router: appRouterTest,
      endpoint: "/api",
    });

    it("should handle batch requests", async () => {
      const req = new Request("http://localhost/api/_batch", {
        method: "POST",
        body: JSON.stringify({
          requests: [
            { id: 1, path: "sayHello", args: ["Alice"] },
            { id: 2, path: "sayHello", args: ["Bob"] },
            { id: 3, path: "users.getUser", args: [1] },
          ],
        }),
      });

      const res = await api.fetch(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.responses).toHaveLength(3);
      expect(body.responses[0]).toEqual({ id: 1, ok: true, data: "Hello Alice" });
      expect(body.responses[1]).toEqual({ id: 2, ok: true, data: "Hello Bob" });
      expect(body.responses[2]).toMatchObject({ id: 3, ok: true });
    });

    it("should handle partial failures in batch", async () => {
      const req = new Request("http://localhost/api/_batch", {
        method: "POST",
        body: JSON.stringify({
          requests: [
            { id: 1, path: "sayHello", args: ["Test"] },
            { id: 2, path: "failingProcedure", args: [] },
          ],
        }),
      });

      const res = await api.fetch(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.responses[0]).toEqual({ id: 1, ok: true, data: "Hello Test" });
      expect(body.responses[1]).toMatchObject({
        id: 2,
        ok: false,
        error: { message: "This always fails", code: "BAD_REQUEST" },
      });
    });

    it("should use custom batch endpoint", async () => {
      const customApi = srpcFetchApi({
        router: appRouterTest,
        endpoint: "/api",
        batchEndpoint: "/bulk",
      });

      const req = new Request("http://localhost/api/bulk", {
        method: "POST",
        body: JSON.stringify({
          requests: [{ id: 1, path: "sayHello", args: ["Custom"] }],
        }),
      });

      const res = await customApi.fetch(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.responses[0].data).toBe("Hello Custom");
    });
  });
});
