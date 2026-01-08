import type { AnySRPC } from ".";
import { defaultSerializer, type Serializer } from "../shared";
import { srpcFetchApi } from "./fetch";

import { createServer, Server, type IncomingMessage } from "node:http";

async function bodyParser(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }
  return body;
}

function incomingMessageToRequest(
  req: IncomingMessage,
  body: string
): Request {
  const host = req.headers.host ?? "localhost";
  const proto =
    (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() ??
    ((req.socket as any)?.encrypted ? "https" : "http");
  const url = new URL(`${proto}://${host}${req.url}`);

  return new Request(url.toString(), {
    method: req.method ?? "GET",
    headers: Object.entries(req.headers).reduce(
      (acc, [key, value]) => {
        if (value) {
          acc[key] = Array.isArray(value) ? value.join(", ") : value;
        }
        return acc;
      },
      {} as Record<string, string>
    ),
    body: req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
  });
}

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
  // Create fetch adapter with a wrapper for context that uses IncomingMessage
  let currentIncomingMessage: IncomingMessage | null = null;

  const fetchApi = srpcFetchApi({
    router,
    endpoint,
    transformer: serializer,
    batchEndpoint,
    createContext: async () => {
      if (!currentIncomingMessage) {
        return undefined as TRouter["__context"];
      }
      return createContext?.(currentIncomingMessage) as Promise<
        TRouter["__context"]
      >;
    },
  });

  return createServer(async function (req, res) {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end();
      return;
    }

    // Parse body first
    const body = await bodyParser(req);

    // Store reference for context creation
    currentIncomingMessage = req;

    try {
      // Convert to WinterCG Request
      const request = incomingMessageToRequest(req, body);

      // Delegate to fetch adapter
      const response = await fetchApi.fetch(request);

      // Convert Response back to Node
      res.writeHead(response.status, {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
      });
      res.end(await response.text());
    } finally {
      currentIncomingMessage = null;
    }
  });
};
