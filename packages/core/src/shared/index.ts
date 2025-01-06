import { AnyProcedure, Routes } from "../server";

export interface Serializer {
  serialize: (value: any) => any;
  deserialize: (value: any) => any;
}

export const defaultSerializer: Serializer = {
  serialize: (value) => JSON.stringify(value),
  deserialize: (value) => JSON.parse(value),
};

export type ErrorCodes =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "INTERNAL_SERVER_ERROR"
  | "BAD_REQUEST"
  | "NOT_IMPLEMENTED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "GENERIC_ERROR";

export class SRPCError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCodes
  ) {
    super(message);
    this.name = "SRPCError";
  }

  __BRAND__ = "SRPCError";
}

export type InferProcedureInput<T extends AnyProcedure> = T extends (
  _ctx,
  ...args: infer TArgs
) => any
  ? TArgs
  : never;

export type ClientProcedure<T extends AnyProcedure> = (
  ...args: InferProcedureInput<T>
) => ReturnType<T>;

export type DecoratedProcedureRecord<TRouter extends Routes<any>> = {
  [TKey in keyof TRouter]: TRouter[TKey] extends AnyProcedure
    ? ClientProcedure<TRouter[TKey]>
    : never;
};
