/**
 * @module
 *
 * Client-side SRPC module for creating type-safe RPC clients.
 *
 * This module provides the `createSRPCClient` function which creates a proxy-based
 * client that converts method calls into HTTP requests to your SRPC server.
 *
 * @example
 * ```typescript
 * import { createSRPCClient } from "@srpc.org/core/client";
 * import type { AppRouter } from "./server";
 *
 * const client = createSRPCClient<AppRouter>({
 *   endpoint: "http://localhost:3000/api",
 *   headers: async () => ({
 *     "Authorization": `Bearer ${await getToken()}`
 *   })
 * });
 *
 * // Type-safe procedure calls
 * const user = await client.users.getUser(1);
 * const result = await client.users.admin.createUser({ name: "Jane" });
 * ```
 */

import { type AnySRPC } from "../server";
import type { Routes } from "../server/api";
import {
  type DecoratedProcedureRecord,
  type Serializer,
  defaultSerializer,
  SRPCError,
} from "../shared";
import { createRecursiveProxy } from "../shared/proxy";
export * from "../shared";

/**
 * Configuration options for creating an SRPC client.
 *
 * @property endpoint - Base URL for the SRPC server (e.g., "http://localhost:3000/api")
 * @property headers - Optional function to provide custom headers for each request
 * @property transformer - Optional custom serializer for request/response data (default: JSON)
 * @property fetch - Optional custom fetch implementation (default: globalThis.fetch)
 *
 * @example
 * ```typescript
 * const options: SRPCClientOptions = {
 *   endpoint: "http://localhost:3000/api",
 *   headers: async ({ path }) => {
 *     const token = await getAuthToken();
 *     return {
 *       "Authorization": `Bearer ${token}`,
 *       "X-Request-Path": path.join(".")
 *     };
 *   },
 *   transformer: customSerializer,
 *   fetch: customFetch
 * };
 * ```
 */
export type SRPCClientOptions = {
  endpoint: string;
  headers?: (op: {
    path: readonly string[];
  }) => HeadersInit | Promise<HeadersInit>;
  transformer?: Serializer;
  fetch?: typeof fetch;
};

/**
 * Creates a type-safe SRPC client that converts method calls into HTTP requests.
 *
 * The client uses JavaScript Proxies to intercept property access and method calls,
 * automatically converting them into HTTP POST requests to the server. All procedure
 * calls are fully type-safe based on the router type provided.
 *
 * @template TRouter - The SRPC router type from your server
 * @template TRoutes - Internal routes type (inferred automatically)
 *
 * @param options - Client configuration options
 * @returns A type-safe client proxy matching your server's router structure
 *
 * @example Basic usage
 * ```typescript
 * import { createSRPCClient } from "@srpc.org/core/client";
 * import type { AppRouter } from "./server";
 *
 * const client = createSRPCClient<AppRouter>({
 *   endpoint: "http://localhost:3000/api"
 * });
 *
 * // All calls are type-checked
 * const greeting = await client.sayHello("World"); // string
 * const user = await client.users.getUser(1); // User type
 * ```
 *
 * @example With authentication headers
 * ```typescript
 * const client = createSRPCClient<AppRouter>({
 *   endpoint: "http://localhost:3000/api",
 *   headers: async () => ({
 *     "Authorization": `Bearer ${await getAuthToken()}`
 *   })
 * });
 * ```
 *
 * @example With custom serialization
 * ```typescript
 * import superjson from "superjson";
 *
 * const client = createSRPCClient<AppRouter>({
 *   endpoint: "http://localhost:3000/api",
 *   transformer: {
 *     serialize: (value) => superjson.stringify(value),
 *     deserialize: (value) => superjson.parse(value)
 *   }
 * });
 *
 * // Now Date, Map, Set, etc. are properly serialized
 * await client.createEvent({ date: new Date() });
 * ```
 *
 * @example Error handling
 * ```typescript
 * import { SRPCError } from "@srpc.org/core";
 *
 * try {
 *   await client.users.getUser(999);
 * } catch (error) {
 *   if (error instanceof SRPCError) {
 *     console.log(error.code); // "NOT_FOUND"
 *     console.log(error.message); // "User not found"
 *   }
 * }
 * ```
 */
export const createSRPCClient = <
  TRouter extends AnySRPC,
  TRoutes extends Routes<any> = TRouter["ipc"],
>({
  endpoint,
  headers: getHeaders,
  transformer = defaultSerializer,
  fetch = globalThis.fetch,
}: SRPCClientOptions): DecoratedProcedureRecord<TRoutes> => {
  return createRecursiveProxy<DecoratedProcedureRecord<TRoutes>>(
    async ({ path, args }) => {
      const headers = await getHeaders?.({ path: path });
      const response = await fetch(`${endpoint}/${path.join(".")}`, {
        method: "POST",
        body: transformer.serialize(args),
        headers,
      });

      const responseText = await response.text();
      const data = transformer.deserialize(responseText);

      if (!response.ok) {
        if ("__BRAND__" in data && data.__BRAND__ === "SRPCError") {
          throw new SRPCError(data.message, data.code);
        }

        throw new SRPCError(
          response.statusText || "Unknown error",
          "GENERIC_ERROR"
        );
      }

      return data;
    }
  );
};
