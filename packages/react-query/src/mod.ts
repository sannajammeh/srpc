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

export * from "./context";

export type OptionsFactory<
  Procedure extends ClientProcedure<any>,
  TInput = Parameters<Procedure>,
  TOutput = ReturnType<Procedure>,
> = {
  queryOptions: (...args: Parameters<Procedure>) => UseQueryOptions<TOutput>;
  mutationOptions: () => UseMutationOptions<TOutput, Error, TInput>;
};

export type DecoratedQueryProcedureRecord<TRouter extends AnyRoutes> = {
  [TKey in keyof TRouter]: TRouter[TKey] extends AnyProcedure
    ? OptionsFactory<ClientProcedure<TRouter[TKey]>>
    : TRouter[TKey] extends SRPC<any>
      ? DecoratedQueryProcedureRecord<TRouter[TKey]["ipc"]>
      : never;
};

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
