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

export type SRPCClientOptions = {
  endpoint: string;
  headers?: (op: {
    path: readonly string[];
  }) => HeadersInit | Promise<HeadersInit>;
  transformer?: Serializer;
  fetch?: typeof fetch;
};

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
