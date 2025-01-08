import { describe, expect, inject, it, suite, vi } from "vitest";
import { createSRPCClient } from ".";
import { type TestRouter } from "../test/test-router";

suite("createSRPCClient", () => {
  describe("[sanity] - basic behaviour", () => {
    it("Should create a proxy client", () => {
      const client = createSRPCClient<TestRouter>({
        endpoint: "http://localhost:3000",
      });

      expect(client).toBeDefined();
    });

    it("Should call the correct procedure", async () => {
      const fetchImpl = vi.fn(
        (info: URL | string | RequestInfo, init?: RequestInit) => {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "test" }))
          );
        }
      );

      const client = createSRPCClient<TestRouter>({
        endpoint: "http://localhost:3000",
        fetch: fetchImpl,
      });

      const result = await client.users.getUser(1);

      expect(result).toEqual({ message: "test" });

      expect(fetchImpl).toHaveBeenCalledWith(
        "http://localhost:3000/users.getUser",
        expect.anything()
      );
    });

    it("Should call the correct nested procedure", async () => {
      const fetchImpl = vi.fn(
        (info: URL | string | RequestInfo, init?: RequestInit) => {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "test" }))
          );
        }
      );

      const client = createSRPCClient<TestRouter>({
        endpoint: "http://localhost:3000",
        fetch: fetchImpl,
      });

      const result = await client.users.admin.createUser(1);

      expect(result).toEqual({ message: "test" });

      expect(fetchImpl).toHaveBeenCalledWith(
        "http://localhost:3000/users.admin.createUser",
        expect.anything()
      );
    });
  });

  describe("[E2E]", () => {
    const port = inject("srpcPort");
    const endpoint = inject("srpcEndpoint");

    const client = createSRPCClient<TestRouter>({
      endpoint: `http://localhost:${port}${endpoint}`,
    });

    it("Should call the correct procedure", async () => {
      const response = await client.sayHello("John");

      expect(response).toBe("Hello John");
    });

    it("Should call the correct procedure with nested router", async () => {
      const user = await client.users.admin.createUser(4);
      expect(user.id).toBe(4);
    });
  });
});
