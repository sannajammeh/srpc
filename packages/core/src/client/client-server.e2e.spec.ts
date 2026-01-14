import { describe, expect, inject, it, suite } from "vitest";
import { createSRPCClient, SRPCError } from ".";
import { type TestRouter } from "../test/test-router";

suite("Client-Server E2E", () => {
  const port = inject("srpcPort");
  const endpoint = inject("srpcEndpoint");

  describe("[E2E] - procedure calls", () => {
    const client = createSRPCClient<TestRouter>({
      endpoint: `http://localhost:${port}${endpoint}`,
    });

    it("should call simple procedure", async () => {
      const result = await client.sayHello("E2E");

      expect(result).toBe("Hello E2E");
    });

    it("should call nested procedure", async () => {
      const user = await client.users.getUser(100);

      expect(user).toEqual({
        id: 100,
        name: "John Doe",
        email: "john@doe.com",
      });
    });

    it("should call deeply nested procedure", async () => {
      const user = await client.users.admin.createUser(200);

      expect(user.id).toBe(200);
    });
  });

  describe("[E2E] - error propagation", () => {
    const client = createSRPCClient<TestRouter>({
      endpoint: `http://localhost:${port}${endpoint}`,
    });

    it("should propagate SRPCError from server to client", async () => {
      await expect(client.failingProcedure()).rejects.toThrow(SRPCError);
    });

    it("should preserve error code and message", async () => {
      await expect(client.failingProcedure()).rejects.toMatchObject({
        message: "This always fails",
        code: "BAD_REQUEST",
      });
    });
  });

  describe("[E2E] - concurrent requests", () => {
    const client = createSRPCClient<TestRouter>({
      endpoint: `http://localhost:${port}${endpoint}`,
    });

    it("should handle multiple concurrent requests", async () => {
      const results = await Promise.all([
        client.sayHello("A"),
        client.sayHello("B"),
        client.sayHello("C"),
        client.users.getUser(1),
        client.users.getUser(2),
      ]);

      expect(results[0]).toBe("Hello A");
      expect(results[1]).toBe("Hello B");
      expect(results[2]).toBe("Hello C");
      expect(results[3].id).toBe(1);
      expect(results[4].id).toBe(2);
    });

    it("should handle mixed success and failure concurrently", async () => {
      const results = await Promise.allSettled([
        client.sayHello("Success"),
        client.failingProcedure(),
        client.users.getUser(42),
      ]);

      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("rejected");
      expect(results[2].status).toBe("fulfilled");

      if (results[0].status === "fulfilled") {
        expect(results[0].value).toBe("Hello Success");
      }
      if (results[1].status === "rejected") {
        expect(results[1].reason).toBeInstanceOf(SRPCError);
      }
    });
  });

  describe("[E2E] - custom headers", () => {
    it("should send custom headers with request", async () => {
      const client = createSRPCClient<TestRouter>({
        endpoint: `http://localhost:${port}${endpoint}`,
        headers: async () => ({
          "X-Custom-Header": "test-value",
          Authorization: "Bearer token123",
        }),
      });

      // Request should succeed (headers don't affect test router)
      const result = await client.sayHello("Headers");
      expect(result).toBe("Hello Headers");
    });
  });

  describe("[E2E] - multiple arguments", () => {
    const client = createSRPCClient<TestRouter>({
      endpoint: `http://localhost:${port}${endpoint}`,
    });

    it("should correctly serialize single argument", async () => {
      const result = await client.sayHello("SingleArg");
      expect(result).toBe("Hello SingleArg");
    });

    it("should correctly serialize numeric argument", async () => {
      const user = await client.users.getUser(999);
      expect(user.id).toBe(999);
    });
  });
});
