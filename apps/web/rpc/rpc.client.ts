import { createSRPCClient } from "@srpc/core/client";
import { type AppRouter } from "../app/server/srpc";
import * as transformer from "seroval";

export const rpcClient = createSRPCClient<AppRouter>({
  endpoint: "/api/srpc",
  transformer,
});
