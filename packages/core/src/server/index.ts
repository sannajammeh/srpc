import {
  type DecoratedProcedureRecord,
  type Serializer,
  defaultSerializer,
  SRPCError,
  StatusCodeMap,
} from "../shared";
import { createRecursiveProxy } from "../shared/proxy";
import { sRPC_API, initSRPC, SRPC, type AnySRPC } from "./api";
import { srpcFetchApi } from "./fetch";

export { SRPC };

export { initSRPC };

export { srpcFetchApi };

export { type AnySRPC };

export const createSRPCCaller = <TRouter extends AnySRPC>({
  createContext,
  router,
}: {
  createContext?: () => Promise<TRouter["__context"]>;
  router: TRouter;
}): DecoratedProcedureRecord<TRouter["__routes"]> => {
  return createRecursiveProxy<DecoratedProcedureRecord<TRouter["__routes"]>>(
    async ({ path, args }) => {
      const api = new sRPC_API({
        router,
      });

      const context = await createContext?.();

      return api.call(
        path.join(".") as keyof TRouter["__routes"],
        context,
        args
      );
    }
  );
};
