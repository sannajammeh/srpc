/**
 * @module
 *
 * React Context integration for SRPC with React Query.
 *
 * This module provides React Context-based access to SRPC procedures with React Query
 * integration. It creates a Provider component and hooks for accessing RPC functionality
 * throughout your React application.
 *
 * @example Complete setup
 * ```typescript
 * import { createSRPCClient } from "@srpc/core/client";
 * import { createSRPCContext } from "@srpc/react-query/context";
 * import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 * import type { AppRouter } from "./server";
 *
 * // Create client
 * const client = createSRPCClient<AppRouter>({ endpoint: "/api" });
 *
 * // Create context and hooks
 * export const { SRPCProvider, useSRPC, useSRPCClient } =
 *   createSRPCContext<AppRouter>();
 *
 * // Setup in app
 * function App() {
 *   const [queryClient] = useState(() => new QueryClient());
 *
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <SRPCProvider client={client}>
 *         <YourApp />
 *       </SRPCProvider>
 *     </QueryClientProvider>
 *   );
 * }
 *
 * // Use in components
 * function UserProfile() {
 *   const srpc = useSRPC();
 *   const { data } = useQuery(srpc.users.getUser.queryOptions(1));
 *   return <div>{data?.name}</div>;
 * }
 * ```
 */

"use client";

import type { AnySRPC } from "@srpc/core/server";
import type { DecoratedProcedureRecord } from "@srpc/core/shared";
import React, {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import {
  createSRPCQueryOptions,
  type DecoratedQueryProcedureRecord,
} from "./mod";

/**
 * Type definition for the SRPC context value.
 *
 * Contains both the raw client for direct RPC calls and the decorated
 * SRPC object with React Query options.
 *
 * @template TRouter - The SRPC router type
 *
 * @property client - Raw SRPC client for direct procedure calls
 * @property srpc - Decorated procedures with `.queryOptions()` and `.mutationOptions()`
 */
export interface SRPCContextValue<TRouter extends AnySRPC> {
  client: DecoratedProcedureRecord<TRouter["ipc"]>;
  srpc: DecoratedQueryProcedureRecord<TRouter["ipc"]>;
}

/**
 * Return type of `createSRPCContext` containing all React components and hooks.
 *
 * @template TRouter - The SRPC router type
 *
 * @property SRPCContext - React Context object (rarely used directly)
 * @property SRPCProvider - Provider component to wrap your app
 * @property useSRPC - Hook to access decorated procedures with React Query options
 * @property useSRPCClient - Hook to access the raw SRPC client
 *
 * @example
 * ```typescript
 * const { SRPCProvider, useSRPC, useSRPCClient } = createSRPCContext<AppRouter>();
 *
 * // SRPCProvider: Wrap your app
 * <SRPCProvider client={rpcClient}>
 *   <App />
 * </SRPCProvider>
 *
 * // useSRPC: Get React Query options in components
 * const srpc = useSRPC();
 * const query = useQuery(srpc.users.getUser.queryOptions(1));
 *
 * // useSRPCClient: Get raw client for direct calls
 * const client = useSRPCClient();
 * const result = await client.users.getUser(1);
 * ```
 */
export type SRPCContextFactory<TRouter extends AnySRPC> = {
  SRPCContext: React.Context<SRPCContextValue<TRouter>>;
  SRPCProvider: ({
    children,
    client,
  }: PropsWithChildren<{
    client: DecoratedProcedureRecord<TRouter["ipc"]>;
  }>) => React.JSX.Element;
  useSRPC: () => DecoratedQueryProcedureRecord<TRouter["ipc"]>;
  useSRPCClient: () => DecoratedProcedureRecord<TRouter["ipc"]>;
};

/**
 * Factory function to create SRPC React Context, Provider, and hooks.
 *
 * Creates a type-safe React Context system for accessing SRPC procedures throughout
 * your React application. The returned hooks provide access to both React Query
 * integrated procedures and the raw RPC client.
 *
 * @template TRouter - The SRPC router type from your server
 *
 * @returns Object containing:
 * - `SRPCContext` - React Context (rarely needed directly)
 * - `SRPCProvider` - Provider component that accepts `client` prop
 * - `useSRPC()` - Hook returning decorated procedures with `.queryOptions()` and `.mutationOptions()`
 * - `useSRPCClient()` - Hook returning the raw SRPC client for direct calls
 *
 * @example Basic setup
 * ```typescript
 * import { createSRPCClient } from "@srpc/core/client";
 * import { createSRPCContext } from "@srpc/react-query";
 * import type { AppRouter } from "./server";
 *
 * // Create client
 * const rpcClient = createSRPCClient<AppRouter>({ endpoint: "/api" });
 *
 * // Create context utilities
 * export const { SRPCProvider, useSRPC, useSRPCClient } =
 *   createSRPCContext<AppRouter>();
 *
 * // In root component
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <SRPCProvider client={rpcClient}>
 *         <YourApp />
 *       </SRPCProvider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 *
 * @example Using in components with queries
 * ```typescript
 * import { useSRPC } from "./rpc";
 * import { useQuery } from "@tanstack/react-query";
 *
 * function UserProfile({ userId }: { userId: number }) {
 *   const srpc = useSRPC();
 *
 *   const { data, isLoading, error } = useQuery(
 *     srpc.users.getUser.queryOptions(userId)
 *   );
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <h2>{data.name}</h2>
 *       <p>{data.email}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Using in components with mutations
 * ```typescript
 * import { useSRPC } from "./rpc";
 * import { useMutation, useQueryClient } from "@tanstack/react-query";
 *
 * function CreateUserForm() {
 *   const srpc = useSRPC();
 *   const queryClient = useQueryClient();
 *
 *   const createUser = useMutation({
 *     ...srpc.users.createUser.mutationOptions(),
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({ queryKey: ["users"] });
 *     },
 *   });
 *
 *   return (
 *     <form onSubmit={(e) => {
 *       e.preventDefault();
 *       const formData = new FormData(e.currentTarget);
 *       createUser.mutate({
 *         name: formData.get("name") as string,
 *         email: formData.get("email") as string,
 *       });
 *     }}>
 *       <input name="name" required />
 *       <input name="email" type="email" required />
 *       <button disabled={createUser.isPending}>Create User</button>
 *     </form>
 *   );
 * }
 * ```
 *
 * @example Using raw client for direct calls
 * ```typescript
 * import { useSRPCClient } from "./rpc";
 *
 * function DirectCallExample() {
 *   const client = useSRPCClient();
 *
 *   const handleClick = async () => {
 *     // Direct RPC call without React Query
 *     const result = await client.sayHello("World");
 *     console.log(result); // "Hello World!"
 *   };
 *
 *   return <button onClick={handleClick}>Call RPC</button>;
 * }
 * ```
 *
 * @example Nested routers
 * ```typescript
 * function NestedRouterExample() {
 *   const srpc = useSRPC();
 *
 *   // All nested paths are fully typed
 *   const userQuery = useQuery(srpc.users.getUser.queryOptions(1));
 *   const adminQuery = useQuery(srpc.users.admin.getStats.queryOptions());
 *   const postQuery = useQuery(srpc.posts.drafts.list.queryOptions());
 *
 *   return <div>...</div>;
 * }
 * ```
 *
 * @example With Next.js App Router
 * ```typescript
 * // app/providers.tsx
 * "use client";
 *
 * import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 * import { rpcClient, SRPCProvider } from "@/lib/rpc";
 * import { useState } from "react";
 *
 * export function Providers({ children }: { children: React.ReactNode }) {
 *   const [queryClient] = useState(() => new QueryClient());
 *
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <SRPCProvider client={rpcClient}>
 *         {children}
 *       </SRPCProvider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 */
export function createSRPCContext<
  TRouter extends AnySRPC,
>(): SRPCContextFactory<TRouter> {
  // biome-ignore lint/style/noNonNullAssertion: <Asserting non null for context>
  const SRPCContext = createContext<SRPCContextValue<TRouter>>(null!);

  function SRPCProvider({
    children,
    client,
  }: PropsWithChildren<{
    client: DecoratedProcedureRecord<TRouter["ipc"]>;
  }>) {
    const srpc = useMemo(() => {
      return createSRPCQueryOptions({
        client: client,
      });
    }, [client]);

    return (
      <SRPCContext.Provider value={{ client: client, srpc }}>
        {children}
      </SRPCContext.Provider>
    );
  }

  function useSRPC() {
    const ctx = useContext(SRPCContext);
    if (!ctx) {
      throw new Error("useSRPC must be used within a SRPCProvider");
    }

    return ctx.srpc;
  }

  function useSRPCClient() {
    const ctx = useContext(SRPCContext);
    if (!ctx) {
      throw new Error("useSRPCClient must be used within a SRPCProvider");
    }

    return ctx.client;
  }

  return {
    SRPCContext,
    SRPCProvider,
    useSRPC,
    useSRPCClient,
  };
}
