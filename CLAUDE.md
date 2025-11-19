# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SRPC is a lightweight, type-safe RPC (Remote Procedure Call) framework for TypeScript. The repository is structured as a **Turborepo monorepo** with two core packages and a Next.js demo application.

## Commands

### Development
```bash
pnpm dev              # Start all apps in development mode
pnpm build            # Build all packages and apps
pnpm lint             # Run ESLint across all workspaces
pnpm format           # Format code with Prettier
```

### Testing
```bash
# Run tests in specific packages
cd packages/core && pnpm test          # Run core tests once
cd packages/core && pnpm test:dev     # Run core tests in watch mode
cd packages/react-query && pnpm test   # Run react-query tests once
cd packages/react-query && pnpm test:dev  # Run react-query tests in watch mode
```

### Type Checking
```bash
turbo check-types     # Type check all workspaces
cd apps/web && pnpm check-types  # Type check web app only
```

### Publishing
```bash
cd packages/core && pnpm release         # Test and publish core to JSR
cd packages/react-query && pnpm release  # Test and publish react-query to JSR
```

## Architecture

### Core Package (`@srpc/core`)

The heart of the RPC framework, providing both server and client functionality.

**Key Architectural Components:**

- **Server Layer** (`/server`):
  - `SRPC<TContext, TRoutes>`: Generic router builder with fluent API
  - `sRPC_API<TRouter>`: Request handler that resolves dot-notation paths (e.g., `"users.admin.createUser"`) to procedures
  - `createSrpcServer()`: Node.js HTTP server adapter
  - `srpcFetchApi()`: Web Fetch API adapter (compatible with edge runtimes)
  - `createSRPCCaller()`: Server-side caller for direct procedure invocation

- **Client Layer** (`/client`):
  - `createSRPCClient<TRouter>(options)`: Creates type-safe proxy client
  - Uses recursive proxies to convert nested property access into RPC calls
  - Example: `client.users.admin.createUser(4)` → POST to `/users.admin.createUser` with body `[4]`

- **Shared Layer** (`/shared`):
  - `createRecursiveProxy()`: Core proxy factory that enables dynamic nested API
  - `SRPCError`: Standardized error class with error codes mapped to HTTP status codes
  - `Serializer` interface: Pluggable serialization (default: JSON)
  - Type utilities: `InferRouterInputs`, `InferRouterOutputs`, `DecoratedProcedureRecord`

**Communication Pattern:**
```
Client: client.users.getUser(1)
  ↓ Proxy intercepts
  ↓ HTTP POST /users.getUser with body [1]
Server: Resolves path → Calls procedure(context, 1)
  ↓ Returns result or SRPCError
Client: Deserializes response
```

**Procedure Signature Convention:**
All RPC procedures follow this pattern:
```typescript
async (context: TContext, ...args: any[]) => any
```
- Context is always the first parameter on the server
- Client calls omit the context parameter
- Server adapters inject context automatically

### React Query Package (`@srpc/react-query`)

Provides React Query integration for SRPC procedures.

**Key Exports:**

- `createSRPCQueryOptions<TRouter>()`: Transforms SRPC client into decorated query procedures
  - Adds `.queryOptions(...args)` accessor for React Query's `useQuery`
  - Adds `.mutationOptions()` accessor for React Query's `useMutation`
  - Uses recursive proxies to maintain type safety

- `createSRPCContext<TRouter>()`: Returns React context utilities:
  - `SRPCProvider`: Context provider component
  - `useSRPC()`: Hook returning decorated query procedures
  - `useSRPCClient()`: Hook returning raw RPC client

**Integration Pattern:**
```typescript
// Server
const appRouter = initSRPC().router({ ... });

// Client setup
const client = createSRPCClient<typeof appRouter>({ endpoint: '/api' });
const queryClient = createSRPCQueryOptions({ client });

// React component
const query = queryClient.users.getUser.queryOptions(userId);
const { data } = useQuery(query);
```

### Web App (`apps/web`)

Next.js application demonstrating SRPC usage with Server Components and React Query.

**Key Patterns:**

- **Package Imports Pattern**: Uses Node.js subpath imports in `package.json` to provide different implementations for client vs server:
  ```json
  "#rpc": {
    "browser": "./rpc/rpc.client.ts",
    "react-server": "./rpc/rpc.server.ts"
  }
  ```
  - Server Components import `#rpc` → get `createSRPCCaller` for direct server-side calls
  - Client Components import `#rpc` → get `createSRPCClient` for HTTP-based calls

- **Serialization**: Uses `seroval` library for complex data serialization (Dates, Maps, Sets, etc.)

## Monorepo Structure

```
packages/
  core/              # @srpc/core - Core RPC framework
    src/
      server/        # Server-side router and adapters
      client/        # Client proxy builder
      shared/        # Shared utilities and types
      test/          # Test suite with Vitest
  react-query/       # @srpc/react-query - React Query integration
  ui/                # Shared React components
  typescript-config/ # Shared TypeScript configurations
  eslint-config/     # Shared ESLint configurations
apps/
  web/               # Next.js demo application
```

## Development Workflow

1. **Adding a new RPC procedure**: Edit router in server code → Type safety automatically flows to client
2. **Testing packages**: Each package has its own Vitest config with `globalSetup.ts` for integration tests
3. **Publishing**: Packages use JSR (JavaScript Registry) for distribution
4. **Type checking**: Enabled in Vitest tests via `typecheck: { enabled: true }`

## Important Implementation Details

- **Proxy Caching**: `createRecursiveProxy` caches proxies by path to prevent object identity issues
- **Error Handling**: Always throw `SRPCError` with appropriate error codes for proper HTTP status mapping
- **Context Creation**: Server adapters accept `createContext` callbacks for per-request context injection
- **Edge Runtime Support**: `srpcFetchApi` adapter works with Cloudflare Workers, Vercel Edge, etc.
- **Turborepo Caching**: Build tasks use `dependsOn: ["^build"]` for proper dependency ordering
