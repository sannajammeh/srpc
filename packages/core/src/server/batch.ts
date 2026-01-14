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
  serializer: Serializer,
  maxBatchSize = 100,
): Promise<BatchResponse> {
  const parsed = serializer.deserialize(body);

  if (!parsed || typeof parsed !== "object" || !("requests" in parsed)) {
    throw new SRPCError("Invalid batch request format", "BAD_REQUEST");
  }

  const { requests } = parsed as BatchRequest;

  if (!Array.isArray(requests)) {
    throw new SRPCError("Batch requests must be an array", "BAD_REQUEST");
  }

  if (requests.length === 0) {
    throw new SRPCError("Batch cannot be empty", "BAD_REQUEST");
  }

  if (requests.length > maxBatchSize) {
    throw new SRPCError(
      `Batch size ${requests.length} exceeds maximum ${maxBatchSize}`,
      "BAD_REQUEST",
    );
  }

  for (const req of requests) {
    if (!req || typeof req !== "object") {
      throw new SRPCError("Invalid batch request item", "BAD_REQUEST");
    }
    if (typeof req.id !== "number" || typeof req.path !== "string") {
      throw new SRPCError("Batch item must have id and path", "BAD_REQUEST");
    }
    if (!Array.isArray(req.args)) {
      throw new SRPCError("Batch item args must be an array", "BAD_REQUEST");
    }
  }

  const results = await Promise.allSettled(
    requests.map((req) =>
      api.call(req.path as keyof TRouter["ipc"], context, req.args),
    ),
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
