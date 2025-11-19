import { createSRPCCaller } from "@srpc.org/core/server";
import { type AppRouter, appRouter } from "../app/server/srpc";

export const rpcServer = createSRPCCaller<AppRouter>({
  router: appRouter,
});
