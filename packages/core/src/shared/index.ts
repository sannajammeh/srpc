import { SRPC, type AnySRPC } from "../server";
import type { Routes } from "../server/api";
import type { AnyProcedure } from "./types";

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

export const StatusCodeMap = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  UNSUPPORTED_MEDIA_TYPE: 415,
  GENERIC_ERROR: 500,
};

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
  _ctx: any,
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
    : TRouter[TKey] extends SRPC<any>
      ? DecoratedProcedureRecord<TRouter[TKey]["__routes"]>
      : never;
};

export type InferRPCFromRouter<TRouter extends AnySRPC> =
  DecoratedProcedureRecord<TRouter["__routes"]>;
