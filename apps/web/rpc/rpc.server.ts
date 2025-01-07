import { createSRPCCaller } from "@srpc/core/server";
import { type AppRouter, appRouter } from "../app/server/srpc";

export const rpcServer = createSRPCCaller<AppRouter>({
  router: appRouter,
});
