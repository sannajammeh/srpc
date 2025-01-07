import {
  DecoratedProcedureRecord,
  defaultSerializer,
  Serializer,
  SRPCError,
  StatusCodeMap,
} from "../shared";
import { createRecursiveProxy } from "../shared/proxy";

export type Routes<TContext> = {
  [key: string]: ProcedureType<TContext> | SRPC<TContext>;
};

export type ProcedureType<TContext> = (
  ctx: TContext,
  ...args: any[]
) => Promise<any>;

export type AnyProcedure = ProcedureType<any>;

export class SRPC<TContext, TRoutes extends Routes<TContext> = {}> {
  public __context!: TContext;

  public __routes!: TRoutes;

  constructor(routes?: TRoutes) {
    if (routes) {
      this.__routes = routes;
    }
  }

  context<T>(): SRPC<T> {
    return new SRPC<T>();
  }

  router<T extends Routes<TContext>>(routes: T): SRPC<TContext, T> {
    return new SRPC<TContext, T>(routes);
  }
}

export const initSRPC = (): SRPC<unknown> => {
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
    const pathString = path.toString();

    const value = (this.#router.__routes as any)[path] as TRoutes[T];

    if (value) {
      return value;
    }

    if (pathString.includes(".")) {
      let current: TRouter["__routes"] | SRPC<any> | null =
        this.#router.__routes;
      const pathParts = pathString.split(".");

      for (const key of pathParts) {
        if (current && current instanceof SRPC) {
          current = (current.__routes as any)[key];
          continue;
        } else if (current && typeof current === "object" && key in current) {
          current = (current as any)[key];
        } else {
          current = null;
        }
      }

      return current;
    }

    return (this.#router.__routes as any)[path] as TRoutes[T];
  }

  async call<T extends keyof TRoutes>(
    path: T,
    context: TRouter["__context"],
    deserializedArgs: readonly any[]
  ) {
    const route = this.getRoute(path);
    if (typeof route !== "function") {
      throw new SRPCError(`Route ${String(path)} not found`, "NOT_FOUND");
    }

    return (route as Function)(context, ...deserializedArgs);
  }
}

export const srpcFetchApi = <TRouter extends AnySRPC>({
  router,
  endpoint,
  createContext,
  transformer: serializer = defaultSerializer,
}: sRPCOptions<TRouter> & {
  createContext?: (req: Request) => Promise<TRouter["__context"]>;
  transformer?: Serializer;
  endpoint: string;
}): {
  fetch: (req: Request) => Promise<Response>;
} => {
  const api = new sRPC_API({
    router,
  });

  return {
    fetch: async (req: Request) => {
      const url = new URL(req.url);
      const context = await createContext?.(req);
      const path = url.pathname.replace(`${endpoint}/`, "");
      const body = await req.text();
      const deserializedArgs = serializer.deserialize(body);

      try {
        const data = await api.call(
          path as keyof TRouter["__routes"],
          context,
          deserializedArgs
        );

        return new Response(serializer.serialize(data), {
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        if (error instanceof SRPCError) {
          return new Response(serializer.serialize(error), {
            status: StatusCodeMap[error.code],
            headers: {
              "Content-Type": "application/json",
            },
          });
        }

        const message = error instanceof Error ? error.message : String(error);

        return new Response(
          serializer.serialize(new SRPCError(message, "INTERNAL_SERVER_ERROR")),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
    },
  };
};

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
