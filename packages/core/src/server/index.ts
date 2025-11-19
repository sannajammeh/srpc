/**
 * @module
 *
 * Server-side SRPC module for creating routers and handling RPC requests.
 *
 * This module provides the core server functionality including:
 * - Router initialization and composition
 * - Fetch API adapter for edge runtimes
 * - Server-side procedure calling without HTTP
 *
 * @example
 * ```typescript
 * import { initSRPC, srpcFetchApi } from "@srpc.org/core/server";
 *
 * // Initialize and create router
 * const s = initSRPC();
 * const appRouter = s.router({
 *   sayHello: async (_, name: string) => `Hello ${name}!`
 * });
 *
 * // Create Fetch API handler
 * const { fetch: handleRequest } = srpcFetchApi({
 *   router: appRouter,
 *   endpoint: "/api"
 * });
 * ```
 */

import {
  type DecoratedProcedureRecord,
  type Serializer,
  defaultSerializer,
  SRPCError,
  StatusCodeMap,
} from "../shared";
import { createRecursiveProxy } from "../shared/proxy";
import { sRPC_API, initSRPC, SRPC, type AnySRPC } from "./api";
import { srpcFetchApi } from "./fetch";

/**
 * Main router class containing context and procedures.
 *
 * Use `initSRPC()` to create an instance, then use the fluent API to
 * define context type and router procedures.
 *
 * @template TContext - The context type available to all procedures
 * @template TRoutes - The routes/procedures defined in this router
 *
 * @example
 * ```typescript
 * import { initSRPC } from "@srpc.org/core/server";
 *
 * type Context = { user?: { id: number } };
 *
 * const s = initSRPC().context<Context>();
 * const router = s.router({
 *   getUser: async (ctx, id: number) => {
 *     // ctx is typed as Context
 *     return { id, name: "John" };
 *   }
 * });
 * ```
 */
export { SRPC };

/**
 * Initializes a new SRPC router builder.
 *
 * This is the entry point for creating SRPC routers. Call this function
 * to start building your type-safe RPC API.
 *
 * @returns A new SRPC instance with unknown context type
 *
 * @example Basic usage
 * ```typescript
 * import { initSRPC } from "@srpc.org/core/server";
 *
 * const s = initSRPC();
 *
 * const appRouter = s.router({
 *   sayHello: async (_, name: string) => `Hello ${name}!`,
 *   getUser: async (_, id: number) => ({ id, name: "John" })
 * });
 *
 * export type AppRouter = typeof appRouter;
 * ```
 *
 * @example With context
 * ```typescript
 * type Context = { user: { id: number; name: string } };
 *
 * const s = initSRPC().context<Context>();
 *
 * const appRouter = s.router({
 *   getCurrentUser: async (ctx) => ctx.user,
 *   updateUser: async (ctx, data: { name: string }) => {
 *     // Update user using ctx.user.id
 *     return { ...ctx.user, ...data };
 *   }
 * });
 * ```
 *
 * @example Nested routers
 * ```typescript
 * const s = initSRPC();
 *
 * const adminRouter = s.router({
 *   createUser: async (_, data) => ({ id: 1, ...data })
 * });
 *
 * const usersRouter = s.router({
 *   getUser: async (_, id: number) => ({ id, name: "John" }),
 *   admin: adminRouter
 * });
 *
 * const appRouter = s.router({
 *   users: usersRouter,
 *   sayHello: async (_, name: string) => `Hello ${name}!`
 * });
 * ```
 */
export { initSRPC };

/**
 * Creates a Fetch API handler for SRPC routers.
 *
 * Returns an object with a `fetch` function that handles standard Request
 * objects and returns Response objects. This makes it compatible with:
 * - Cloudflare Workers
 * - Vercel Edge Functions
 * - Deno Deploy
 * - Bun
 * - Any framework supporting the Fetch API standard
 *
 * @template TRouter - The SRPC router type
 *
 * @param options - Configuration object
 * @param options.router - The SRPC router to handle requests for
 * @param options.endpoint - The base path for RPC endpoints (e.g., "/api")
 * @param options.createContext - Optional function to create context from request
 * @param options.transformer - Optional custom serializer (default: JSON)
 *
 * @returns Object with `fetch` function that handles Request → Response
 *
 * @example Basic Fetch API usage
 * ```typescript
 * import { initSRPC, srpcFetchApi } from "@srpc.org/core/server";
 *
 * const s = initSRPC();
 * const appRouter = s.router({
 *   sayHello: async (_, name: string) => `Hello ${name}!`
 * });
 *
 * const { fetch: handleRequest } = srpcFetchApi({
 *   router: appRouter,
 *   endpoint: "/api"
 * });
 *
 * // Cloudflare Workers / Bun
 * export default { fetch: handleRequest };
 *
 * // Deno
 * Deno.serve(handleRequest);
 * ```
 *
 * @example With context from request
 * ```typescript
 * type Context = { user?: { id: number } };
 *
 * const s = initSRPC().context<Context>();
 * const appRouter = s.router({
 *   getCurrentUser: async (ctx) => {
 *     if (!ctx.user) throw new SRPCError("Not authenticated", "UNAUTHORIZED");
 *     return ctx.user;
 *   }
 * });
 *
 * const { fetch: handleRequest } = srpcFetchApi({
 *   router: appRouter,
 *   endpoint: "/api",
 *   createContext: async (req) => {
 *     const token = req.headers.get("Authorization");
 *     const user = await validateToken(token);
 *     return { user };
 *   }
 * });
 * ```
 *
 * @example With custom serialization
 * ```typescript
 * import superjson from "superjson";
 *
 * const { fetch: handleRequest } = srpcFetchApi({
 *   router: appRouter,
 *   endpoint: "/api",
 *   transformer: {
 *     serialize: (value) => superjson.stringify(value),
 *     deserialize: (value) => superjson.parse(value)
 *   }
 * });
 * ```
 */
export { srpcFetchApi };

/**
 * Type representing any SRPC router instance.
 *
 * Used as a constraint for generic types that accept any router.
 */
export { type AnySRPC };

/**
 * Creates a server-side caller for direct procedure invocation without HTTP.
 *
 * Useful for:
 * - Calling procedures from server components
 * - Server-side rendering (SSR)
 * - Internal server-to-server communication
 * - Testing procedures without HTTP overhead
 *
 * @template TRouter - The SRPC router type
 *
 * @param options - Configuration object
 * @param options.router - The SRPC router to create a caller for
 * @param options.createContext - Optional function to create context for calls
 *
 * @returns A type-safe caller proxy matching your router structure
 *
 * @example Basic usage
 * ```typescript
 * import { createSRPCCaller, initSRPC } from "@srpc.org/core/server";
 *
 * const s = initSRPC();
 * const appRouter = s.router({
 *   sayHello: async (_, name: string) => `Hello ${name}!`,
 *   getUser: async (_, id: number) => ({ id, name: "John" })
 * });
 *
 * const caller = createSRPCCaller({ router: appRouter });
 *
 * // Call procedures directly
 * const greeting = await caller.sayHello("World"); // "Hello World!"
 * const user = await caller.getUser(1); // { id: 1, name: "John" }
 * ```
 *
 * @example With context
 * ```typescript
 * type Context = { db: Database; user?: User };
 *
 * const s = initSRPC().context<Context>();
 * const appRouter = s.router({
 *   getCurrentUser: async (ctx) => {
 *     if (!ctx.user) throw new Error("Not authenticated");
 *     return ctx.user;
 *   },
 *   getPosts: async (ctx) => {
 *     return ctx.db.posts.findAll();
 *   }
 * });
 *
 * const caller = createSRPCCaller({
 *   router: appRouter,
 *   createContext: async () => ({
 *     db: getDatabase(),
 *     user: await getCurrentUser()
 *   })
 * });
 *
 * const posts = await caller.getPosts();
 * ```
 *
 * @example In Next.js Server Components
 * ```typescript
 * // server/rpc.ts
 * export const rpcCaller = createSRPCCaller({
 *   router: appRouter,
 *   createContext: async () => ({
 *     db: getDatabase(),
 *     user: await getServerSession()
 *   })
 * });
 *
 * // app/page.tsx
 * import { rpcCaller } from "@/server/rpc";
 *
 * export default async function Page() {
 *   const user = await rpcCaller.getCurrentUser();
 *   return <div>Hello {user.name}</div>;
 * }
 * ```
 */
export const createSRPCCaller = <TRouter extends AnySRPC>({
  createContext,
  router,
}: {
  createContext?: () => Promise<TRouter["__context"]>;
  router: TRouter;
}): DecoratedProcedureRecord<TRouter["ipc"]> => {
  return createRecursiveProxy<DecoratedProcedureRecord<TRouter["ipc"]>>(
    async ({ path, args }) => {
      const api = new sRPC_API({
        router,
      });

      const context = await createContext?.();

      return api.call(path.join(".") as keyof TRouter["ipc"], context, args);
    }
  );
};
