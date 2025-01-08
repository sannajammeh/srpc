import { SRPCError } from "../shared";
import type { ProcedureType } from "../shared/types";

export type Routes<TContext> = {
  [key: string]: ProcedureType<TContext> | SRPC<TContext>;
};

export type AnySRPC = SRPC<any>;

export type SrpcBaseOptions<TRouter extends AnySRPC> = {
  router: TRouter;
};

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

export class sRPC_API<TRouter extends AnySRPC, TRoutes = TRouter["__routes"]> {
  #router: TRouter;
  #options: SrpcBaseOptions<TRouter>;

  constructor(options: SrpcBaseOptions<TRouter>) {
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
