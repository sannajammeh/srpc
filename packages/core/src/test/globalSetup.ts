import { createSrpcServer } from "../server/standalone";
import { appRouterTest } from "./test-router";
import type { GlobalSetupContext } from "vitest/node";
import { getPort } from "get-port-please";

export default async function setup({ provide }: GlobalSetupContext) {
  const endpoint = "/api/srpc";
  const server = createSrpcServer({
    router: appRouterTest,
    endpoint,
  });

  const port = await getPort();
  server.listen(port, () => {
    console.log(`Srpc server listening on port ${port}`);
  });

  provide("srpcPort", port);
  provide("srpcEndpoint", endpoint);
}

declare module "vitest" {
  export interface ProvidedContext {
    srpcPort: number;
    srpcEndpoint: string;
  }
}
