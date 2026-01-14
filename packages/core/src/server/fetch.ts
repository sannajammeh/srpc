import type { AnySRPC } from ".";
import {
  defaultSerializer,
  SRPCError,
  StatusCodeMap,
  type Serializer,
} from "../shared";
import { sRPC_API, type SrpcBaseOptions } from "./api";
import { handleBatchRequest } from "./batch";

export const srpcFetchApi = <TRouter extends AnySRPC>({
  router,
  endpoint,
  createContext,
  transformer: serializer = defaultSerializer,
  batchEndpoint = "/_batch",
}: SrpcBaseOptions<TRouter> & {
  createContext?: (req: Request) => Promise<TRouter["__context"]>;
  transformer?: Serializer;
  endpoint: string;
  /** Batch endpoint path (default: "/_batch") */
  batchEndpoint?: string;
}): {
  fetch: (req: Request) => Promise<Response>;
} => {
  const api = new sRPC_API({
    router,
  });

  return {
    fetch: async (req: Request) => {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // Handle batch endpoint
      if (pathname === `${endpoint}${batchEndpoint}`) {
        try {
          const context = await createContext?.(req);
          const body = await req.text();
          const result = await handleBatchRequest(
            api,
            body,
            context,
            serializer,
          );
          return new Response(serializer.serialize(result), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          if (error instanceof SRPCError) {
            return new Response(
              serializer.serialize({
                ...error,
                stack: null,
                message: error.message,
              }),
              {
                status: StatusCodeMap[error.code],
                statusText: error.message,
                headers: {
                  "Content-Type": "application/json",
                },
              },
            );
          }

          const message =
            error instanceof Error ? error.message : String(error);
          console.error(error);

          return new Response(
            serializer.serialize(
              new SRPCError(message, "INTERNAL_SERVER_ERROR"),
            ),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }
      }

      const context = await createContext?.(req);

      const path = pathname.replace(`${endpoint}/`, "");
      const body = await req.text();
      const deserializedArgs = serializer.deserialize(body);

      try {
        const data = await api.call(
          path as keyof TRouter["ipc"],
          context,
          deserializedArgs,
        );

        return new Response(serializer.serialize(data), {
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        if (error instanceof SRPCError) {
          return new Response(
            serializer.serialize({
              ...error,
              stack: null,
              message: error.message,
            }),
            {
              status: StatusCodeMap[error.code],
              statusText: error.message,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        const message = error instanceof Error ? error.message : String(error);

        console.error(error);

        return new Response(
          serializer.serialize(new SRPCError(message, "INTERNAL_SERVER_ERROR")),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }
    },
  };
};
