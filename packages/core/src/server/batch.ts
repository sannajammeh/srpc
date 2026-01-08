/**
 * Batch request handler for SRPC.
 *
 * Processes multiple RPC calls in a single HTTP request.
 */

import type { AnySRPC } from "./api";
import { sRPC_API } from "./api";
import { SRPCError, type Serializer } from "../shared";

export interface BatchRequestItem {
  id: number;
  path: string;
  args: unknown[];
}

export interface BatchResponseItem {
  id: number;
  ok: boolean;
  data?: unknown;
  error?: {
    __BRAND__: "SRPCError";
    message: string;
    code: string;
  };
}

export interface BatchRequest {
  requests: BatchRequestItem[];
}

export interface BatchResponse {
  responses: BatchResponseItem[];
}

export async function handleBatchRequest<TRouter extends AnySRPC>(
  api: sRPC_API<TRouter, TRouter["ipc"]>,
  body: string,
  context: TRouter["__context"],
  serializer: Serializer
): Promise<BatchResponse> {
  const { requests } = serializer.deserialize(body) as BatchRequest;

  const results = await Promise.allSettled(
    requests.map((req) =>
      api.call(req.path as keyof TRouter["ipc"], context, req.args)
    )
  );

  const responses: BatchResponseItem[] = results.map((result, i) => {
    const id = requests[i].id;

    if (result.status === "fulfilled") {
      return { id, ok: true, data: result.value };
    }

    const error = result.reason;
    if (error instanceof SRPCError) {
      return {
        id,
        ok: false,
        error: {
          __BRAND__: "SRPCError" as const,
          message: error.message,
          code: error.code,
        },
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    return {
      id,
      ok: false,
      error: {
        __BRAND__: "SRPCError" as const,
        message,
        code: "INTERNAL_SERVER_ERROR",
      },
    };
  });

  return { responses };
}
