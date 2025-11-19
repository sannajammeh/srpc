/**
 * @module
 *
 * React Query integration for SRPC - Type-safe RPC with automatic query and mutation options.
 *
 * This module provides the core functionality for integrating SRPC with TanStack React Query.
 * It transforms SRPC client procedures into React Query-compatible options objects that can
 * be used with `useQuery` and `useMutation` hooks.
 *
 * @example Basic usage
 * ```typescript
 * import { createSRPCClient } from "@srpc/core/client";
 * import { createSRPCQueryOptions } from "@srpc.org/react-query";
 * import { useQuery } from "@tanstack/react-query";
 * import type { AppRouter } from "./server";
 *
 * // Create client
 * const client = createSRPCClient<AppRouter>({ endpoint: "/api" });
 *
 * // Transform to React Query options
 * const srpc = createSRPCQueryOptions({ client });
 *
 * // Use in components
 * function MyComponent() {
 *   const { data } = useQuery(srpc.users.getUser.queryOptions(1));
 *   return <div>{data?.name}</div>;
 * }
 * ```
 *
 * @example With React Context
 * ```typescript
 * import { createSRPCContext } from "@srpc.org/react-query";
 *
 * // Create context and hooks
 * const { SRPCProvider, useSRPC } = createSRPCContext<AppRouter>();
 *
 * // Setup provider
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <SRPCProvider client={rpcClient}>
 *         <MyComponent />
 *       </SRPCProvider>
 *     </QueryClientProvider>
 *   );
 * }
 *
 * // Use in components
 * function MyComponent() {
 *   const srpc = useSRPC();
 *   const { data } = useQuery(srpc.users.getUser.queryOptions(1));
 * }
 * ```
 */

/** biome-ignore-all lint/suspicious/noExplicitAny: <Allow any type cast> */
import type { AnySRPC, SRPC } from "@srpc/core/server";
import {
  createRecursiveProxy,
  type AnyProcedure,
  type AnyRoutes,
  type ClientProcedure,
  type DecoratedProcedureRecord,
} from "@srpc/core/shared";
import {
  mutationOptions,
  queryOptions,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

/**
 * Type representing the query and mutation options factory for a single procedure.
 *
 * Each procedure in the SRPC router is transformed to have two methods:
 * - `queryOptions(...args)` - Returns React Query options for `useQuery`
 * - `mutationOptions()` - Returns React Query options for `useMutation`
 *
 * @template Procedure - The client procedure type
 * @template TInput - Input parameters type (inferred from procedure)
 * @template TOutput - Output/return type (inferred from procedure)
 *
 * @example
 * ```typescript
 * // For a procedure: getUser(id: number) => Promise<User>
 * type GetUserOptions = OptionsFactory<typeof getUser>;
 *
 * // Has methods:
 * const options: GetUserOptions = {
 *   queryOptions: (id: number) => UseQueryOptions<Promise<User>>,
 *   mutationOptions: () => UseMutationOptions<Promise<User>, Error, [number]>
 * };
 * ```
 */
export type OptionsFactory<
  Procedure extends ClientProcedure<any>,
  TInput = Parameters<Procedure>,
  TOutput = ReturnType<Procedure>,
> = {
  queryOptions: (...args: Parameters<Procedure>) => UseQueryOptions<TOutput>;
  mutationOptions: () => UseMutationOptions<TOutput, Error, TInput>;
};

/**
 * Type that recursively transforms an SRPC router into a structure with React Query options.
 *
 * For each procedure in the router, adds `.queryOptions()` and `.mutationOptions()` methods.
 * Handles nested routers recursively, preserving the router structure.
 *
 * @template TRouter - The SRPC router routes type
 *
 * @example
 * ```typescript
 * // Server router
 * const appRouter = s.router({
 *   getUser: async (_, id: number) => ({ id, name: "John" }),
 *   users: s.router({
 *     createUser: async (_, data: UserData) => ({ id: 1, ...data })
 *   })
 * });
 *
 * // Client with query options
 * type QueryRouter = DecoratedQueryProcedureRecord<typeof appRouter["ipc"]>;
 * // {
 * //   getUser: {
 * //     queryOptions: (id: number) => UseQueryOptions<User>,
 * //     mutationOptions: () => UseMutationOptions<User, Error, [number]>
 * //   },
 * //   users: {
 * //     createUser: {
 * //       queryOptions: (data: UserData) => UseQueryOptions<UserResult>,
 * //       mutationOptions: () => UseMutationOptions<UserResult, Error, [UserData]>
 * //     }
 * //   }
 * // }
 * ```
 */
export type DecoratedQueryProcedureRecord<TRouter extends AnyRoutes> = {
  [TKey in keyof TRouter]: TRouter[TKey] extends AnyProcedure
    ? OptionsFactory<ClientProcedure<TRouter[TKey]>>
    : TRouter[TKey] extends SRPC<any>
      ? DecoratedQueryProcedureRecord<TRouter[TKey]["ipc"]>
      : never;
};

/**
 * Transforms an SRPC client into React Query-compatible query and mutation options.
 *
 * This function takes an SRPC client and returns a proxy object where each procedure
 * has `.queryOptions()` and `.mutationOptions()` methods that generate options for
 * React Query's `useQuery` and `useMutation` hooks.
 *
 * The proxy automatically:
 * - Generates query keys based on the procedure path and arguments
 * - Wraps procedure calls in query/mutation functions
 * - Preserves type safety throughout the chain
 *
 * @template TRouter - The SRPC router type
 * @template TRoutes - The routes type (inferred automatically)
 *
 * @param options - Configuration object
 * @param options.client - The SRPC client created with `createSRPCClient`
 *
 * @returns Decorated procedures with `.queryOptions()` and `.mutationOptions()` methods
 *
 * @example Basic usage
 * ```typescript
 * import { createSRPCClient } from "@srpc/core/client";
 * import { createSRPCQueryOptions } from "@srpc.org/react-query";
 * import { useQuery, useMutation } from "@tanstack/react-query";
 * import type { AppRouter } from "./server";
 *
 * const client = createSRPCClient<AppRouter>({ endpoint: "/api" });
 * const srpc = createSRPCQueryOptions({ client });
 *
 * function UserProfile({ userId }: { userId: number }) {
 *   // Use with useQuery
 *   const { data, isLoading } = useQuery(
 *     srpc.users.getUser.queryOptions(userId)
 *   );
 *
 *   return <div>{data?.name}</div>;
 * }
 * ```
 *
 * @example With mutations
 * ```typescript
 * function CreateUserForm() {
 *   const createUser = useMutation(srpc.users.createUser.mutationOptions());
 *
 *   const handleSubmit = (data: UserData) => {
 *     createUser.mutate(data);
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 *
 * @example With query options
 * ```typescript
 * function UserList() {
 *   const { data } = useQuery({
 *     ...srpc.users.list.queryOptions(),
 *     staleTime: 5000,
 *     refetchInterval: 10000,
 *   });
 *
 *   return <ul>{data?.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
 * }
 * ```
 *
 * @example Nested routers
 * ```typescript
 * // Works with deeply nested routers
 * const userQuery = useQuery(srpc.users.getUser.queryOptions(1));
 * const adminQuery = useQuery(srpc.users.admin.getStats.queryOptions());
 * const draftQuery = useQuery(srpc.posts.drafts.list.queryOptions());
 * ```
 */
export function createSRPCQueryOptions<
  TRouter extends AnySRPC,
  TRoutes extends AnyRoutes = TRouter["ipc"],
>({
  client,
}: {
  client: DecoratedProcedureRecord<TRoutes>;
}): DecoratedQueryProcedureRecord<TRoutes> {
  return createRecursiveProxy<DecoratedQueryProcedureRecord<TRoutes>>(
    ({ path, args }) => {
      const lastPath = path[path.length - 1];
      const pathWithoutTarget = path.slice(0, -1);

      const procedure: ClientProcedure<any> = pathWithoutTarget.reduce(
        (acc, key) => acc[key] as any,
        client as ClientProcedure<any> & Record<string, any>
      );

      if (typeof procedure !== "function") {
        throw new Error(
          `Procedure at path ${pathWithoutTarget.join(".")} is not a function`
        );
      }

      if (lastPath === "queryOptions") {
        return queryOptions({
          queryKey: [...pathWithoutTarget, args],
          queryFn: () => procedure(...args),
        });
      }

      if (lastPath === "mutationOptions") {
        return mutationOptions({
          mutationKey: [...pathWithoutTarget, args],
          mutationFn: (variables: any[]) => procedure(...variables),
        });
      }

      throw new Error(`Unknown target path at: ${path.join(".")}`);
    }
  );
}
