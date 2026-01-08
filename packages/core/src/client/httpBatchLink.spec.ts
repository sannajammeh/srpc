import { describe, expect, inject, it, suite, vi, beforeEach } from "vitest";
import { createSRPCClient, httpBatchLink, SRPCError } from ".";
import { type TestRouter } from "../test/test-router";

suite("httpBatchLink", () => {
  describe("[unit] - batching behavior", () => {
    it("should batch multiple requests within time window", async () => {
      const fetchImpl = vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              responses: [
                { id: 1, ok: true, data: "Hello A" },
                { id: 2, ok: true, data: "Hello B" },
              ],
            })
          )
        )
      );

      const client = createSRPCClient<TestRouter>({
        endpoint: "http://localhost:3000",
        link: httpBatchLink({
          endpoint: "http://localhost:3000",
          fetch: fetchImpl,
          batchWindowMs: 50,
        }),
      });

      const [a, b] = await Promise.all([
        client.sayHello("A"),
        client.sayHello("B"),
      ]);

      expect(a).toBe("Hello A");
      expect(b).toBe("Hello B");

      // Should only make one fetch call (batched)
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(fetchImpl).toHaveBeenCalledWith(
        "http://localhost:3000/_batch",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should flush immediately when max batch size is reached", async () => {
      let callCount = 0;
      const fetchImpl = vi.fn(() => {
        callCount++;
        const currentCall = callCount;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              responses:
                currentCall === 1
                  ? [
                      { id: 1, ok: true, data: "r1" },
                      { id: 2, ok: true, data: "r2" },
                    ]
                  : [{ id: 3, ok: true, data: "r3" }],
            })
          )
        );
      });

      const client = createSRPCClient<TestRouter>({
        endpoint: "http://localhost:3000",
        link: httpBatchLink({
          endpoint: "http://localhost:3000",
          fetch: fetchImpl,
          maxBatchSize: 2,
          batchWindowMs: 1000, // long window, but should flush at 2
        }),
      });

      // Fire 3 requests - first 2 should batch, 3rd in new batch
      const promises = [
        client.sayHello("1"),
        client.sayHello("2"),
        client.sayHello("3"),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual(["r1", "r2", "r3"]);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it("should handle partial failures", async () => {
      const fetchImpl = vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              responses: [
                { id: 1, ok: true, data: "success" },
                {
                  id: 2,
                  ok: false,
                  error: {
                    __BRAND__: "SRPCError",
                    message: "Failed",
                    code: "BAD_REQUEST",
                  },
                },
              ],
            })
          )
        )
      );

      const client = createSRPCClient<TestRouter>({
        endpoint: "http://localhost:3000",
        link: httpBatchLink({
          endpoint: "http://localhost:3000",
          fetch: fetchImpl,
          batchWindowMs: 10,
        }),
      });

      const successPromise = client.sayHello("ok");
      const failPromise = client.failingProcedure();

      const success = await successPromise;
      expect(success).toBe("success");

      await expect(failPromise).rejects.toThrow(SRPCError);
      await expect(failPromise).rejects.toMatchObject({
        message: "Failed",
        code: "BAD_REQUEST",
      });
    });

    it("should reject all on transport error", async () => {
      const fetchImpl = vi.fn(() =>
        Promise.resolve(new Response("Server Error", { status: 500 }))
      );

      const client = createSRPCClient<TestRouter>({
        endpoint: "http://localhost:3000",
        link: httpBatchLink({
          endpoint: "http://localhost:3000",
          fetch: fetchImpl,
          batchWindowMs: 10,
        }),
      });

      const p1 = client.sayHello("A");
      const p2 = client.sayHello("B");

      await expect(p1).rejects.toThrow(SRPCError);
      await expect(p2).rejects.toThrow(SRPCError);
    });

    it("should use custom batch endpoint", async () => {
      const fetchImpl = vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              responses: [{ id: 1, ok: true, data: "test" }],
            })
          )
        )
      );

      const client = createSRPCClient<TestRouter>({
        endpoint: "http://localhost:3000/api",
        link: httpBatchLink({
          endpoint: "http://localhost:3000/api",
          fetch: fetchImpl,
          batchEndpoint: "/custom-batch",
          batchWindowMs: 10,
        }),
      });

      await client.sayHello("test");

      expect(fetchImpl).toHaveBeenCalledWith(
        "http://localhost:3000/api/custom-batch",
        expect.anything()
      );
    });
  });

  describe("[E2E] - batch endpoint", () => {
    const port = inject("srpcPort");
    const endpoint = inject("srpcEndpoint");

    it("should batch requests to server", async () => {
      const client = createSRPCClient<TestRouter>({
        endpoint: `http://localhost:${port}${endpoint}`,
        link: httpBatchLink({
          endpoint: `http://localhost:${port}${endpoint}`,
          batchWindowMs: 50,
        }),
      });

      const [hello1, hello2, user] = await Promise.all([
        client.sayHello("Alice"),
        client.sayHello("Bob"),
        client.users.getUser(42),
      ]);

      expect(hello1).toBe("Hello Alice");
      expect(hello2).toBe("Hello Bob");
      expect(user).toEqual({ id: 42, name: "John Doe", email: "john@doe.com" });
    });

    it("should handle partial failures from server", async () => {
      const client = createSRPCClient<TestRouter>({
        endpoint: `http://localhost:${port}${endpoint}`,
        link: httpBatchLink({
          endpoint: `http://localhost:${port}${endpoint}`,
          batchWindowMs: 50,
        }),
      });

      const successPromise = client.sayHello("Test");
      const failPromise = client.failingProcedure();

      const success = await successPromise;
      expect(success).toBe("Hello Test");

      await expect(failPromise).rejects.toThrow(SRPCError);
      await expect(failPromise).rejects.toMatchObject({
        message: "This always fails",
        code: "BAD_REQUEST",
      });
    });

    it("should work with single request (batch of 1)", async () => {
      const client = createSRPCClient<TestRouter>({
        endpoint: `http://localhost:${port}${endpoint}`,
        link: httpBatchLink({
          endpoint: `http://localhost:${port}${endpoint}`,
          batchWindowMs: 10,
        }),
      });

      const result = await client.sayHello("Solo");
      expect(result).toBe("Hello Solo");
    });

    it("should work with nested routers", async () => {
      const client = createSRPCClient<TestRouter>({
        endpoint: `http://localhost:${port}${endpoint}`,
        link: httpBatchLink({
          endpoint: `http://localhost:${port}${endpoint}`,
          batchWindowMs: 50,
        }),
      });

      const [user1, user2] = await Promise.all([
        client.users.admin.createUser(1),
        client.users.admin.createUser(2),
      ]);

      expect(user1.id).toBe(1);
      expect(user2.id).toBe(2);
    });
  });
});
