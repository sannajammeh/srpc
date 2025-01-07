import { InferRPCFromRouter } from "@srpc/core/client";
import { AppRouter } from "../app/server/srpc";

let rpc: InferRPCFromRouter<AppRouter>;

if (typeof window !== "undefined") {
  rpc = await import("./rpc.client").then((mod) => mod.rpcClient);
} else {
  rpc = await import("./rpc.server").then((mod) => mod.rpcServer);
}

export { rpc };
