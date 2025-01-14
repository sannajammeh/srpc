import type { AnySRPC } from ".";
import {
  defaultSerializer,
  SRPCError,
  StatusCodeMap,
  type Serializer,
} from "../shared";
import { sRPC_API, type SrpcBaseOptions } from "./api";

import { createServer, Server, type IncomingMessage } from "node:http";

async function bodyParser(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) {
    // Process chunk
    body += chunk;
  }
  return body;
}

export const createSrpcServer = <TRouter extends AnySRPC>({
  router,
  endpoint,
  createContext,
  transformer: serializer = defaultSerializer,
}: SrpcBaseOptions<TRouter> & {
  createContext?: (req: IncomingMessage) => Promise<TRouter["__context"]>;
  transformer?: Serializer;
  endpoint: string;
}): Server => {
  const api = new sRPC_API({
    router,
  });

  return createServer(async function (req, res) {
    const url = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
    const context = await createContext?.(req);

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end();
      return;
    }

    const path = url.pathname.replace(`${endpoint}/`, "");

    // Consume body

    const body = await bodyParser(req);
    const deserializedArgs = serializer.deserialize(body);

    try {
      const data = await api.call(
        path as keyof TRouter["ipc"],
        context,
        deserializedArgs
      );

      res.writeHead(200, {
        "Content-Type": "application/json",
      });
      res.end(serializer.serialize(data));
      return;
    } catch (error) {
      if (error instanceof SRPCError) {
        const statusCode = StatusCodeMap[error.code];
        res.writeHead(statusCode, {
          "Content-Type": "application/json",
        });
        res.end(serializer.serialize(error));
        return;
      }

      const message = error instanceof Error ? error.message : String(error);

      res.writeHead(500, {
        "Content-Type": "application/json",
      });

      res.end(
        serializer.serialize(new SRPCError(message, "INTERNAL_SERVER_ERROR"))
      );
      return;
    }
  });
};
