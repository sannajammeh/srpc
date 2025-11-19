import { createSRPCClient } from "@srpc/core/client";
import type { AppRouter } from "../app/server/srpc";
import * as transformer from "seroval";
import { createSRPCContext } from "@srpc/react-query";

export const rpcClient = createSRPCClient<AppRouter>({
  endpoint: "/api/srpc",
  transformer,
});

export const { SRPCContext, SRPCProvider, useSRPC, useSRPCClient } =
  createSRPCContext<AppRouter>();
