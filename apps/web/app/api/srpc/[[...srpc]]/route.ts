import { srpcFetchApi } from "@srpc/core/server";
import { appRouter } from "../../../server/srpc";
import * as transformer from "seroval";

const api = srpcFetchApi({
  endpoint: "/api/srpc",
  router: appRouter,
  transformer,
});

export const POST = api.fetch;
export const GET = api.fetch;
export const PUT = api.fetch;
export const DELETE = api.fetch;
