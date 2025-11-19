/**
 * @module
 *
 * Shared SRPC utilities, types, and error handling.
 *
 * This module contains types and utilities used by both client and server sides:
 * - Error handling with `SRPCError`
 * - Serialization interfaces
 * - Type inference utilities
 * - Proxy utilities for dynamic API creation
 *
 * @example
 * ```typescript
 * import { SRPCError, type InferRouterInputs, type InferRouterOutputs } from "@srpc.org/core/shared";
 *
 * // Throw typed errors
 * throw new SRPCError("Not found", "NOT_FOUND");
 *
 * // Extract types from router
 * type Inputs = InferRouterInputs<AppRouter>;
 * type Outputs = InferRouterOutputs<AppRouter>;
 * ```
 */

import { SRPC, type AnySRPC } from "../server";
import type { Routes } from "../server/api";
import type { AnyProcedure } from "./types";
import { createFlatProxy, createRecursiveProxy } from "./proxy";

/**
 * Interface for custom serialization strategies.
 *
 * Implement this interface to support serialization formats beyond JSON,
 * such as MessagePack, Protocol Buffers, or superjson for complex types.
 *
 * @example Using superjson for Date, Map, Set support
 * ```typescript
 * import superjson from "superjson";
 * import type { Serializer } from "@srpc.org/core/shared";
 *
 * const customSerializer: Serializer = {
 *   serialize: (value) => superjson.stringify(value),
 *   deserialize: (value) => superjson.parse(value)
 * };
 *
 * // Use with client
 * const client = createSRPCClient<AppRouter>({
 *   endpoint: "/api",
 *   transformer: customSerializer
 * });
 *
 * // Use with server
 * const { fetch } = srpcFetchApi({
 *   router: appRouter,
 *   endpoint: "/api",
 *   transformer: customSerializer
 * });
 * ```
 */
export interface Serializer {
  serialize: (value: any) => any;
  deserialize: (value: any) => any;
}

/**
 * Default JSON-based serializer used by SRPC.
 *
 * Uses `JSON.stringify` for serialization and `JSON.parse` for deserialization.
 * Works with JSON-compatible types (strings, numbers, booleans, objects, arrays, null).
 * Does not support: Date, Map, Set, undefined, functions, symbols.
 *
 * For complex types, provide a custom `Serializer` implementation.
 */
export const defaultSerializer: Serializer = {
  serialize: (value) => JSON.stringify(value),
  deserialize: (value) => JSON.parse(value),
};

/**
 * Union type of all standard error codes in SRPC.
 *
 * Each error code maps to a specific HTTP status code:
 * - `BAD_REQUEST` → 400
 * - `UNAUTHORIZED` → 401
 * - `FORBIDDEN` → 403
 * - `NOT_FOUND` → 404
 * - `UNSUPPORTED_MEDIA_TYPE` → 415
 * - `INTERNAL_SERVER_ERROR` → 500
 * - `NOT_IMPLEMENTED` → 501
 * - `GENERIC_ERROR` → 500 (fallback for unexpected errors)
 */
export type ErrorCodes =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "INTERNAL_SERVER_ERROR"
  | "BAD_REQUEST"
  | "NOT_IMPLEMENTED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "GENERIC_ERROR";

/**
 * Mapping of error codes to HTTP status codes.
 *
 * Used internally by server adapters to convert `SRPCError` instances
 * to appropriate HTTP responses.
 */
export const StatusCodeMap = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  UNSUPPORTED_MEDIA_TYPE: 415,
  GENERIC_ERROR: 500,
};

/**
 * Standard error class for SRPC procedures.
 *
 * Thrown errors are automatically serialized and sent to the client with
 * the appropriate HTTP status code. The client reconstructs the error
 * with the same message and code.
 *
 * @example Throwing errors in procedures
 * ```typescript
 * import { SRPCError } from "@srpc.org/core";
 *
 * const appRouter = s.router({
 *   getUser: async (_, id: number) => {
 *     const user = await db.users.findById(id);
 *     if (!user) {
 *       throw new SRPCError("User not found", "NOT_FOUND");
 *     }
 *     return user;
 *   },
 *   deleteUser: async (ctx, id: number) => {
 *     if (!ctx.user?.isAdmin) {
 *       throw new SRPCError("Insufficient permissions", "FORBIDDEN");
 *     }
 *     await db.users.delete(id);
 *     return { success: true };
 *   }
 * });
 * ```
 *
 * @example Handling errors on the client
 * ```typescript
 * import { SRPCError } from "@srpc.org/core";
 *
 * try {
 *   const user = await client.getUser(999);
 * } catch (error) {
 *   if (error instanceof SRPCError) {
 *     switch (error.code) {
 *       case "NOT_FOUND":
 *         console.log("User not found");
 *         break;
 *       case "FORBIDDEN":
 *         console.log("Access denied");
 *         break;
 *       case "UNAUTHORIZED":
 *         redirectToLogin();
 *         break;
 *     }
 *   }
 * }
 * ```
 */
export class SRPCError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCodes
  ) {
    super(message);
    this.name = "SRPCError";
  }

  __BRAND__ = "SRPCError";
}

/**
 * Type utility to extract input parameter types from a single procedure.
 *
 * Returns a tuple of the procedure's parameters, excluding the context parameter.
 *
 * @template T - The procedure type to extract inputs from
 *
 * @example
 * ```typescript
 * import type { InferProcedureInput } from "@srpc.org/core/shared";
 *
 * type GetUserProcedure = (ctx: Context, id: number) => Promise<User>;
 * type GetUserInput = InferProcedureInput<GetUserProcedure>; // [id: number]
 *
 * type CreateUserProcedure = (ctx: Context, name: string, email: string) => Promise<User>;
 * type CreateUserInput = InferProcedureInput<CreateUserProcedure>; // [name: string, email: string]
 * ```
 */
export type InferProcedureInput<T extends AnyProcedure> = T extends (
  _ctx: any,
  ...args: infer TArgs
) => any
  ? TArgs
  : never;

/**
 * Type utility to convert a server procedure to a client-side callable function.
 *
 * Removes the context parameter and preserves the return type.
 *
 * @template T - The procedure type to convert
 *
 * @example
 * ```typescript
 * import type { ClientProcedure } from "@srpc.org/core/shared";
 *
 * // Server procedure
 * type ServerProc = (ctx: Context, id: number) => Promise<User>;
 *
 * // Client procedure (context removed)
 * type ClientProc = ClientProcedure<ServerProc>; // (id: number) => Promise<User>
 * ```
 */
export type ClientProcedure<T extends AnyProcedure> = (
  ...args: InferProcedureInput<T>
) => ReturnType<T>;

/**
 * Type utility that transforms a router's procedures into client-callable functions.
 *
 * Recursively processes nested routers and converts each procedure to a client
 * procedure (with context parameter removed).
 *
 * @template TRouter - The router routes type
 *
 * @example
 * ```typescript
 * import type { DecoratedProcedureRecord } from "@srpc.org/core/shared";
 *
 * // Server router
 * const appRouter = s.router({
 *   getUser: async (ctx, id: number) => ({ id, name: "John" }),
 *   users: s.router({
 *     admin: s.router({
 *       createUser: async (ctx, data: UserData) => ({ id: 1, ...data })
 *     })
 *   })
 * });
 *
 * type Routes = typeof appRouter["ipc"];
 * type ClientAPI = DecoratedProcedureRecord<Routes>;
 * // {
 * //   getUser: (id: number) => Promise<{ id: number, name: string }>,
 * //   users: {
 * //     admin: {
 * //       createUser: (data: UserData) => Promise<{ id: number } & UserData>
 * //     }
 * //   }
 * // }
 * ```
 */
export type DecoratedProcedureRecord<TRouter extends Routes<any>> = {
  [TKey in keyof TRouter]: TRouter[TKey] extends AnyProcedure
    ? ClientProcedure<TRouter[TKey]>
    : TRouter[TKey] extends SRPC<any>
      ? DecoratedProcedureRecord<TRouter[TKey]["ipc"]>
      : never;
};

/**
 * Type utility to extract the client API type from an SRPC router.
 *
 * Convenience type that wraps `DecoratedProcedureRecord`.
 *
 * @template TRouter - The SRPC router type
 */
export type InferRPCFromRouter<TRouter extends AnySRPC> =
  DecoratedProcedureRecord<TRouter["ipc"]>;

/**
 * Type utility that extracts return types from all procedures in a router.
 *
 * Recursively processes nested routers and extracts awaited return types
 * from each procedure.
 *
 * @template TRouter - The router routes type
 *
 * @example
 * ```typescript
 * import type { DecoratedProcedureOutputs } from "@srpc.org/core/shared";
 *
 * const appRouter = s.router({
 *   getUser: async (ctx, id: number) => ({ id, name: "John" }),
 *   users: s.router({
 *     createUser: async (ctx, data: UserData) => ({ id: 1, ...data })
 *   })
 * });
 *
 * type Routes = typeof appRouter["ipc"];
 * type Outputs = DecoratedProcedureOutputs<Routes>;
 * // {
 * //   getUser: { id: number, name: string },
 * //   users: {
 * //     createUser: { id: number } & UserData
 * //   }
 * // }
 * ```
 */
export type DecoratedProcedureOutputs<TRouter extends Routes<any>> = {
  [TKey in keyof TRouter]: TRouter[TKey] extends AnyProcedure
    ? Awaited<ReturnType<TRouter[TKey]>>
    : TRouter[TKey] extends SRPC<any>
      ? DecoratedProcedureOutputs<TRouter[TKey]["ipc"]>
      : never;
};

/**
 * Type utility to extract output types from all procedures in an SRPC router.
 *
 * Returns a mapped type where each key is a procedure name and the value
 * is the awaited return type of that procedure.
 *
 * @template TRouter - The SRPC router type
 *
 * @example
 * ```typescript
 * import type { InferRouterOutputs } from "@srpc.org/core";
 * import type { AppRouter } from "./server";
 *
 * type RouterOutputs = InferRouterOutputs<AppRouter>;
 *
 * // Use output types in your code
 * type User = RouterOutputs["getUser"];
 * type Post = RouterOutputs["posts"]["getPost"];
 * ```
 */
export type InferRouterOutputs<TRouter extends AnySRPC> =
  DecoratedProcedureOutputs<TRouter["ipc"]>;

/**
 * Type utility that extracts input parameter tuples from all procedures in a router.
 *
 * Recursively processes nested routers and extracts input parameters
 * (excluding context) from each procedure.
 *
 * @template TRouter - The router routes type
 *
 * @example
 * ```typescript
 * import type { DecoratedProcedureInputs } from "@srpc.org/core/shared";
 *
 * const appRouter = s.router({
 *   getUser: async (ctx, id: number) => ({ id, name: "John" }),
 *   users: s.router({
 *     createUser: async (ctx, name: string, email: string) => ({ id: 1, name, email })
 *   })
 * });
 *
 * type Routes = typeof appRouter["ipc"];
 * type Inputs = DecoratedProcedureInputs<Routes>;
 * // {
 * //   getUser: [id: number],
 * //   users: {
 * //     createUser: [name: string, email: string]
 * //   }
 * // }
 * ```
 */
export type DecoratedProcedureInputs<TRouter extends Routes<any>> = {
  [TKey in keyof TRouter]: TRouter[TKey] extends AnyProcedure
    ? InferProcedureInput<TRouter[TKey]>
    : TRouter[TKey] extends SRPC<any>
      ? DecoratedProcedureInputs<TRouter[TKey]["ipc"]>
      : never;
};

/**
 * Type utility to extract input parameter types from all procedures in an SRPC router.
 *
 * Returns a mapped type where each key is a procedure name and the value
 * is a tuple of that procedure's input parameters (excluding context).
 *
 * @template TRouter - The SRPC router type
 *
 * @example
 * ```typescript
 * import type { InferRouterInputs } from "@srpc.org/core";
 * import type { AppRouter } from "./server";
 *
 * type RouterInputs = InferRouterInputs<AppRouter>;
 *
 * // Use input types in your code
 * type GetUserArgs = RouterInputs["getUser"]; // [id: number]
 * type CreatePostArgs = RouterInputs["posts"]["createPost"]; // [title: string, content: string]
 *
 * // Useful for creating type-safe helpers
 * function callGetUser(...args: RouterInputs["getUser"]) {
 *   return client.getUser(...args);
 * }
 * ```
 */
export type InferRouterInputs<TRouter extends AnySRPC> =
  DecoratedProcedureInputs<TRouter["ipc"]>;

/**
 * Type defining the structure of routes in an SRPC router.
 *
 * Routes can contain procedures or nested SRPC instances.
 *
 * @template TContext - The context type available to procedures
 */
export type { Routes };

/**
 * Type representing any procedure function.
 *
 * Used as a constraint for generic types that accept any procedure.
 */
export type { AnyProcedure };

/**
 * Type representing any routes object with any context.
 *
 * Used as a constraint for generic types that accept any routes.
 */
// biome-ignore lint/suspicious/noExplicitAny: <Any Routes is ok>
export type AnyRoutes = Routes<any>;

/**
 * Creates a flat (non-recursive) proxy for intercepting method calls.
 *
 * @internal This is an internal utility used by SRPC's proxy system.
 */
export { createFlatProxy };

/**
 * Creates a recursive proxy that intercepts nested property access and method calls.
 *
 * This is the core utility that enables SRPC's dynamic API. It converts property
 * chains like `client.users.admin.createUser(data)` into structured paths and arguments
 * that can be sent as RPC calls.
 *
 * @internal This is an internal utility used by SRPC's proxy system.
 *
 * @example Internal usage (not typically used directly)
 * ```typescript
 * import { createRecursiveProxy } from "@srpc.org/core/shared";
 *
 * const proxy = createRecursiveProxy(({ path, args }) => {
 *   console.log("Path:", path); // ["users", "admin", "createUser"]
 *   console.log("Args:", args); // [{ name: "Jane" }]
 *   return fetch(`/api/${path.join(".")}`, {
 *     method: "POST",
 *     body: JSON.stringify(args)
 *   });
 * });
 *
 * // Usage:
 * proxy.users.admin.createUser({ name: "Jane" });
 * ```
 */
export { createRecursiveProxy };
