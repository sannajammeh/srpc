import type { AnySRPC } from ".";
import { defaultSerializer, type Serializer } from "../shared";
import { srpcFetchApi } from "./fetch";

import { createServer, type IncomingMessage, type Server } from "node:http";
import { createServerAdapter } from "@whatwg-node/server";

export const createSrpcServer = <TRouter extends AnySRPC>({
  router,
  endpoint,
  createContext,
  transformer: serializer = defaultSerializer,
  batchEndpoint = "/_batch",
}: {
  router: TRouter;
  createContext?: (req: IncomingMessage) => Promise<TRouter["__context"]>;
  transformer?: Serializer;
  endpoint: string;
  /** Batch endpoint path (default: "/_batch") */
  batchEndpoint?: string;
}): Server => {
  const adapter = createServerAdapter<{ req: IncomingMessage }>(
    async (request, ctx) => {
      if (request.method !== "POST") {
        return new Response(null, { status: 405 });
      }

      const context = await createContext?.(ctx.req);
      const fetchApi = srpcFetchApi({
        router,
        endpoint,
        transformer: serializer,
        batchEndpoint,
        createContext: async () => context,
      });

      return fetchApi.fetch(request);
    }
  );

  return createServer(adapter);
};
