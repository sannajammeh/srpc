import { createSRPCClient } from "./client";
import { initSRPC, srpcFetchApi } from "./server";
import { defaultSerializer } from "./shared";

const s = initSRPC().context<{ userId: string }>();

const router = s.router({
  getUser: async (ctx, name: "test") => {
    return "hello";
  },
});

type AppRouter = typeof router;

const api = srpcFetchApi({
  router,
  endpoint: "/api",
  createContext: async (req) => {
    return { userId: "123" };
  },
  transformer: defaultSerializer,
});

const rpc = createSRPCClient<AppRouter>({
  endpoint: "/api",
  transformer: defaultSerializer,
});
