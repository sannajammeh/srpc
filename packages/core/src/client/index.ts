import { AnySRPC, Routes } from "../server";
import {
  DecoratedProcedureRecord,
  defaultSerializer,
  Serializer,
  SRPCError,
} from "../shared";
import { createFlatProxy, createRecursiveProxy } from "../shared/proxy";
export * from "../shared";

export type SRPCClientOptions = {
  endpoint: string;
  headers?: (op: {
    path: readonly string[];
  }) => HeadersInit | Promise<HeadersInit>;
  transformer?: Serializer;
};

export const createSRPCClient = <
  TRouter extends AnySRPC,
  TRoutes extends Routes<any> = TRouter["__routes"],
>({
  endpoint,
  headers: getHeaders,
  transformer = defaultSerializer,
}: SRPCClientOptions): DecoratedProcedureRecord<TRoutes> => {
  return createRecursiveProxy<DecoratedProcedureRecord<TRoutes>>(
    async ({ path, args }) => {
      const headers = await getHeaders?.({ path: path });
      const response = await fetch(`${endpoint}/${path}`, {
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
