/**
 * HTTP Batch Link for SRPC.
 *
 * Batches multiple RPC calls within a time window into a single HTTP request.
 *
 * @example
 * ```typescript
 * import { createSRPCClient, httpBatchLink } from "@srpc.org/core/client";
 *
 * const client = createSRPCClient<AppRouter>({
 *   endpoint: "http://localhost:3000/api",
 *   link: httpBatchLink({
 *     endpoint: "http://localhost:3000/api",
 *     batchWindowMs: 50,
 *     maxBatchSize: 10,
 *   }),
 * });
 *
 * // These calls made within 50ms will batch together
 * const [user1, user2] = await Promise.all([
 *   client.users.getUser(1),
 *   client.users.getUser(2),
 * ]);
 * ```
 */

import { type Serializer, defaultSerializer, SRPCError } from "../shared";
import type { SRPCLink } from "./link";

interface PendingRequest {
  id: number;
  path: string;
  args: readonly unknown[];
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface BatchRequestItem {
  id: number;
  path: string;
  args: unknown[];
}

interface BatchResponseItem {
  id: number;
  ok: boolean;
  data?: unknown;
  error?: {
    __BRAND__: "SRPCError";
    message: string;
    code: string;
  };
}

export interface HttpBatchLinkOptions {
  endpoint: string;
  headers?: () => HeadersInit | Promise<HeadersInit>;
  transformer?: Serializer;
  fetch?: typeof fetch;
  /** Max requests per batch (default: 10) */
  maxBatchSize?: number;
  /** Time window to collect requests in ms (default: 50) */
  batchWindowMs?: number;
  /** Batch endpoint path (default: "/_batch") */
  batchEndpoint?: string;
}

export function httpBatchLink({
  endpoint,
  headers: getHeaders,
  transformer = defaultSerializer,
  fetch: fetchFn = globalThis.fetch,
  maxBatchSize = 10,
  batchWindowMs = 50,
  batchEndpoint = "/_batch",
}: HttpBatchLinkOptions): SRPCLink {
  let pendingRequests: PendingRequest[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let requestIdCounter = 0;

  async function flush() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const batch = pendingRequests;
    pendingRequests = [];

    if (batch.length === 0) return;

    const requestBody: BatchRequestItem[] = batch.map((req) => ({
      id: req.id,
      path: req.path,
      args: [...req.args],
    }));

    try {
      const headers = await getHeaders?.();
      const response = await fetchFn(`${endpoint}${batchEndpoint}`, {
        method: "POST",
        body: transformer.serialize({ requests: requestBody }),
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      });

      if (!response.ok) {
        const error = new SRPCError(
          response.statusText || "Batch request failed",
          "GENERIC_ERROR"
        );
        batch.forEach((req) => req.reject(error));
        return;
      }

      const responseText = await response.text();
      const { responses } = transformer.deserialize(responseText) as {
        responses: BatchResponseItem[];
      };

      const responseMap = new Map(responses.map((r) => [r.id, r]));

      for (const req of batch) {
        const res = responseMap.get(req.id);
        if (!res) {
          req.reject(
            new SRPCError("Missing response for request", "GENERIC_ERROR")
          );
        } else if (res.ok) {
          req.resolve(res.data);
        } else if (res.error) {
          req.reject(
            new SRPCError(res.error.message, res.error.code as ErrorCodes)
          );
        } else {
          req.reject(new SRPCError("Unknown response format", "GENERIC_ERROR"));
        }
      }
    } catch (error) {
      const srpcError =
        error instanceof SRPCError
          ? error
          : new SRPCError(
              error instanceof Error ? error.message : String(error),
              "INTERNAL_SERVER_ERROR"
            );
      batch.forEach((req) => req.reject(srpcError));
    }
  }

  return async ({ path, args }) => {
    return new Promise((resolve, reject) => {
      const id = ++requestIdCounter;
      pendingRequests.push({
        id,
        path: path.join("."),
        args,
        resolve,
        reject,
      });

      if (pendingRequests.length >= maxBatchSize) {
        flush();
      } else if (!timeoutId) {
        timeoutId = setTimeout(flush, batchWindowMs);
      }
    });
  };
}

type ErrorCodes = Parameters<typeof SRPCError.prototype.constructor>[1];
