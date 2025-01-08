import type { SRPC } from "../server";

export type Routes<TContext> = {
  [key: string]: ProcedureType<TContext> | SRPC<TContext>;
};

export type ProcedureType<TContext> = (
  ctx: TContext,
  ...args: any[]
) => Promise<any>;

export type AnyProcedure = ProcedureType<any>;

export type AnySRPC = SRPC<any>;
