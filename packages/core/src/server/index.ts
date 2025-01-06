import {
  DecoratedProcedureRecord,
  defaultSerializer,
  Serializer,
} from "../shared";
import { createFlatProxy } from "../shared/proxy";

export type Routes<TContext> = {
  [key: string]: ProcedureType<TContext>;
};

export type ProcedureType<TContext> = (
  ctx: TContext,
  ...args: any[]
) => Promise<any>;

export type AnyProcedure = ProcedureType<any>;

export class SRPC<TContext, TRoutes extends Routes<TContext> = {}> {
  public __context!: TContext;

  public __routes: TRoutes;

  constructor(routes?: TRoutes) {
    if (routes) {
      this.__routes = routes;
    }
  }

  context<T>() {
    return new SRPC<T>();
  }

  router<T extends Routes<TContext>>(routes: T) {
    return new SRPC<TContext, T>(routes);
  }
}

export const initSRPC = () => {
  return new SRPC();
};

export type AnySRPC = SRPC<any>;

type sRPCOptions<TRouter extends AnySRPC> = {
  router: TRouter;
};

class sRPC_API<TRouter extends AnySRPC, TRoutes = TRouter["__routes"]> {
  #router: TRouter;
  #options: sRPCOptions<TRouter>;

  constructor(options: sRPCOptions<TRouter>) {
    this.#router = options.router;
    this.#options = options;
  }

  getRoute<T extends keyof TRoutes>(path: T) {
    return this.#router.__routes[path as string] as TRoutes[T];
  }

  async call<T extends keyof TRoutes>(
    path: T,
    context: TRouter["__context"],
    deserializedArgs: any[]
  ) {
    const route = this.getRoute(path);
    if (typeof route !== "function") {
      throw new Error(`Route ${String(path)} not found`);
    }

    return route(context, ...deserializedArgs);
  }
}

export const srpcFetchApi = <TRouter extends AnySRPC>({
  router,
  endpoint,
  createContext,
  transformer: serializer = defaultSerializer,
}: sRPCOptions<TRouter> & {
  createContext: (req: Request) => Promise<TRouter["__context"]>;
  transformer?: Serializer;
  endpoint: string;
}) => {
  const api = new sRPC_API({
    router,
  });

  return {
    fetch: async (req: Request) => {
      const context = await createContext(req);
      const path = req.url.replace(endpoint, "");
      const body = await req.json();
      const deserializedArgs = serializer.deserialize(body);
      const data = await api.call(
        path as keyof TRouter["__routes"],
        context,
        deserializedArgs
      );

      return Response.json(serializer.serialize(data));
    },
  };
};

export const createSRPCCaller = <TRouter extends AnySRPC>({
  createContext,
  router,
}: {
  createContext: () => Promise<TRouter["__context"]>;
  router: TRouter;
}) => {
  return createFlatProxy<DecoratedProcedureRecord<TRouter["__routes"]>>(
    (path) => {
      const api = new sRPC_API({
        router,
      });

      return async (...args: any[]) => {
        const context = await createContext();

        return await api.call(path, context, args);
      };
    }
  );
};
