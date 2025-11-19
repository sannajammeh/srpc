import { createSRPCClient } from "@srpc.org/core/client";
import { initSRPC } from "@srpc.org/core/server";
import { createSRPCQueryOptions } from "./mod";

const s = initSRPC();

export const router = s.router({
  sayHello: (_, name: string) => {
    return `Hello, ${name}!`;
  },
});

export type AppRouter = typeof router;

const client = createSRPCClient<AppRouter>({
  endpoint: "http://localhost:3000/srpc",
});

const rpcOptions = createSRPCQueryOptions({
  client,
});

rpcOptions.sayHello.queryOptions("World");
