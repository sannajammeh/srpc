/**
 * Link types for SRPC client transport abstraction.
 *
 * Links allow customizing how RPC calls are transported to the server.
 * The default client uses direct HTTP fetch, but a link can batch requests,
 * add caching, or implement other transport strategies.
 */

export interface SRPCLinkContext {
  path: readonly string[];
  args: readonly unknown[];
}

export type SRPCLink = (ctx: SRPCLinkContext) => Promise<unknown>;
