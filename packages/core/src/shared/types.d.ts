export type ProcedureType<TContext> = (
  ctx: TContext,
  ...args: any[]
) => Promise<any> | any;

export type AnyProcedure = ProcedureType<any>;
