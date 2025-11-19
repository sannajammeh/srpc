/**
 * @module
 *
 * Core SRPC module providing essential types and error handling for the RPC framework.
 *
 * This is the main entrypoint that exports commonly used types and utilities.
 * For more specific functionality, import from the appropriate submodules:
 * - `@srpc/core/server` for server-side router and adapter creation
 * - `@srpc/core/client` for client-side RPC calls
 * - `@srpc/core/shared` for shared utilities and advanced types
 *
 * @example
 * ```typescript
 * import { SRPCError, type InferRouterInputs, type InferRouterOutputs } from "@srpc.org/core";
 * import type { AppRouter } from "./server";
 *
 * // Use type inference utilities
 * type Inputs = InferRouterInputs<AppRouter>;
 * type Outputs = InferRouterOutputs<AppRouter>;
 *
 * // Throw typed errors
 * throw new SRPCError("Not found", "NOT_FOUND");
 * ```
 */

/**
 * Union type of all available error codes in SRPC.
 *
 * Error codes are automatically mapped to appropriate HTTP status codes:
 * - `BAD_REQUEST` → 400
 * - `UNAUTHORIZED` → 401
 * - `FORBIDDEN` → 403
 * - `NOT_FOUND` → 404
 * - `UNSUPPORTED_MEDIA_TYPE` → 415
 * - `INTERNAL_SERVER_ERROR` → 500
 * - `NOT_IMPLEMENTED` → 501
 * - `GENERIC_ERROR` → 500
 */
export { type ErrorCodes } from "./shared";

/**
 * Standard error class for SRPC with error code support.
 *
 * Thrown errors are automatically converted to appropriate HTTP status codes
 * and serialized for transmission to the client.
 *
 * @example
 * ```typescript
 * import { SRPCError } from "@srpc.org/core";
 *
 * // In a procedure
 * const user = await db.users.findById(id);
 * if (!user) {
 *   throw new SRPCError("User not found", "NOT_FOUND");
 * }
 *
 * // Client-side handling
 * try {
 *   await client.getUser(999);
 * } catch (error) {
 *   if (error instanceof SRPCError) {
 *     console.log(error.code); // "NOT_FOUND"
 *   }
 * }
 * ```
 */
export { SRPCError } from "./shared";

/**
 * Type utility to extract input parameter types from all procedures in a router.
 *
 * Returns a mapped type where each key corresponds to a procedure in the router,
 * and the value is a tuple of the procedure's input parameters (excluding context).
 *
 * @template TRouter - The router type to extract inputs from
 *
 * @example
 * ```typescript
 * import type { InferRouterInputs } from "@srpc.org/core";
 * import type { AppRouter } from "./server";
 *
 * type RouterInputs = InferRouterInputs<AppRouter>;
 *
 * // For a procedure: getUser(ctx, id: number)
 * type GetUserInput = RouterInputs["getUser"]; // [id: number]
 *
 * // For nested routers: users.admin.createUser(ctx, data: UserData)
 * type CreateUserInput = RouterInputs["users"]["admin"]["createUser"]; // [data: UserData]
 * ```
 */
export { type InferRouterInputs } from "./shared";

/**
 * Type utility to extract return types from all procedures in a router.
 *
 * Returns a mapped type where each key corresponds to a procedure in the router,
 * and the value is the awaited return type of that procedure.
 *
 * @template TRouter - The router type to extract outputs from
 *
 * @example
 * ```typescript
 * import type { InferRouterOutputs } from "@srpc.org/core";
 * import type { AppRouter } from "./server";
 *
 * type RouterOutputs = InferRouterOutputs<AppRouter>;
 *
 * // For a procedure: getUser(ctx, id: number) => Promise<User>
 * type User = RouterOutputs["getUser"]; // User
 *
 * // For nested routers: users.admin.createUser(ctx, data) => Promise<{ id: number }>
 * type CreateUserOutput = RouterOutputs["users"]["admin"]["createUser"]; // { id: number }
 * ```
 */
export { type InferRouterOutputs } from "./shared";
