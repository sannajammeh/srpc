# @srpc.org/core

A lightweight, type-safe RPC framework for TypeScript with automatic type inference, multiple runtime support, and zero dependencies.

## Installation

```bash
# Using JSR (recommended)
deno add @srpc.org/core
npx jsr add @srpc.org/core
yarn dlx jsr add @srpc.org/core
pnpm dlx jsr add @srpc.org/core
bunx jsr add @srpc.org/core
```

## Features

- **Type-safe**: Full TypeScript support with automatic type inference
- **Zero dependencies**: Lightweight core with no external dependencies
- **Runtime agnostic**: Works with Node.js, Deno, Bun, Cloudflare Workers, and more
- **Multiple adapters**: Support for both Node.js HTTP and standard Fetch API
- **Nested routers**: Organize procedures into nested namespaces
- **Custom serialization**: Pluggable serialization layer
- **Error handling**: Built-in error types with HTTP status code mapping

## Quick Start

### Server Setup

#### Using Fetch API (Recommended for Edge Runtimes)

```typescript
import { initSRPC, srpcFetchApi } from "@srpc.org/core/server";

// Initialize SRPC
const s = initSRPC();

// Define your router
const appRouter = s.router({
  sayHello: async (_, name: string) => {
    return `Hello ${name}!`;
  },
  getUser: async (_, id: number) => {
    return { id, name: "John Doe", email: "john@example.com" };
  },
});

// Export the router type for client usage
export type AppRouter = typeof appRouter;

// Create Fetch API handler
const { fetch: handleRequest } = srpcFetchApi({
  router: appRouter,
  endpoint: "/api",
});

// Use with any framework supporting Fetch API
export default {
  fetch: handleRequest,
};
```

#### Using Node.js HTTP Server

```typescript
import { initSRPC } from "@srpc.org/core/server";
import { createSrpcServer } from "@srpc.org/core/server";

const s = initSRPC();

const appRouter = s.router({
  sayHello: async (_, name: string) => {
    return `Hello ${name}!`;
  },
});

export type AppRouter = typeof appRouter;

// Create Node.js server
const server = createSrpcServer({
  router: appRouter,
  endpoint: "/api",
});

server.listen(3000, () => {
  console.log("SRPC server listening on port 3000");
});
```

### Client Setup

```typescript
import { createSRPCClient } from "@srpc.org/core/client";
import type { AppRouter } from "./server";

// Create type-safe client
const client = createSRPCClient<AppRouter>({
  endpoint: "http://localhost:3000/api",
});

// Call procedures with full type safety
const greeting = await client.sayHello("World"); // Type: string
const user = await client.getUser(1); // Type: { id: number, name: string, email: string }
```

## Advanced Usage

### Nested Routers

Organize your procedures into logical groups:

```typescript
import { initSRPC } from "@srpc.org/core/server";

const s = initSRPC();

// Admin procedures
const adminRouter = s.router({
  createUser: async (_, data: { name: string; email: string }) => {
    // Create user logic
    return { id: 1, ...data };
  },
  deleteUser: async (_, id: number) => {
    // Delete user logic
    return { success: true };
  },
});

// Public user procedures
const usersRouter = s.router({
  getUser: async (_, id: number) => {
    return { id, name: "John Doe" };
  },
  admin: adminRouter, // Nested router
});

// Main app router
const appRouter = s.router({
  users: usersRouter,
  sayHello: async (_, name: string) => `Hello ${name}!`,
});

// Client usage:
// client.users.getUser(1)
// client.users.admin.createUser({ name: "Jane", email: "jane@example.com" })
// client.sayHello("World")
```

### Context

Add context (authentication, database connections, etc.) to your procedures:

```typescript
import { initSRPC, srpcFetchApi } from "@srpc.org/core/server";

// Define your context type
type Context = {
  user?: { id: number; name: string };
  db: Database;
};

// Initialize with context type
const s = initSRPC().context<Context>();

// Use context in procedures
const appRouter = s.router({
  getCurrentUser: async (ctx) => {
    if (!ctx.user) throw new Error("Not authenticated");
    return ctx.user;
  },
  getPost: async (ctx, id: number) => {
    return await ctx.db.posts.findById(id);
  },
});

// Provide context creation function
const { fetch: handleRequest } = srpcFetchApi({
  router: appRouter,
  endpoint: "/api",
  createContext: async (req) => {
    const user = await authenticateRequest(req);
    return { user, db: getDatabase() };
  },
});
```

### Error Handling

Use `SRPCError` for proper HTTP status code mapping:

```typescript
import { initSRPC } from "@srpc.org/core/server";
import { SRPCError } from "@srpc.org/core";

const s = initSRPC();

const appRouter = s.router({
  getUser: async (_, id: number) => {
    const user = await db.users.findById(id);
    if (!user) {
      throw new SRPCError("User not found", "NOT_FOUND"); // Returns HTTP 404
    }
    return user;
  },
  deleteUser: async (_, id: number) => {
    if (!hasPermission()) {
      throw new SRPCError("Unauthorized", "UNAUTHORIZED"); // Returns HTTP 401
    }
    await db.users.delete(id);
    return { success: true };
  },
});

// Client-side error handling
try {
  await client.getUser(999);
} catch (error) {
  if (error instanceof SRPCError) {
    console.log(error.code); // "NOT_FOUND"
    console.log(error.message); // "User not found"
  }
}
```

### Custom Serialization

Use custom serializers for complex data types:

```typescript
import { createSRPCClient } from "@srpc.org/core/client";
import type { Serializer } from "@srpc.org/core/shared";

// Example: Using superjson for Date, Map, Set support
import superjson from "superjson";

const customSerializer: Serializer = {
  serialize: (value) => superjson.stringify(value),
  deserialize: (value) => superjson.parse(value),
};

const client = createSRPCClient<AppRouter>({
  endpoint: "http://localhost:3000/api",
  transformer: customSerializer,
});

// Server-side
const { fetch: handleRequest } = srpcFetchApi({
  router: appRouter,
  endpoint: "/api",
  transformer: customSerializer,
});
```

### Type Inference Utilities

Extract input and output types from your router:

```typescript
import type { InferRouterInputs, InferRouterOutputs } from "@srpc.org/core";
import type { AppRouter } from "./server";

// Get all input types
type RouterInputs = InferRouterInputs<AppRouter>;
type GetUserInput = RouterInputs["getUser"]; // [id: number]

// Get all output types
type RouterOutputs = InferRouterOutputs<AppRouter>;
type GetUserOutput = RouterOutputs["getUser"]; // { id: number, name: string, email: string }
```

### Server-Side Calling

Call procedures directly on the server without HTTP:

```typescript
import { createSRPCCaller } from "@srpc.org/core/server";
import { appRouter } from "./router";

const caller = createSRPCCaller({
  router: appRouter,
  createContext: async () => ({ user: null, db: getDatabase() }),
});

// Call procedures directly
const result = await caller.sayHello("World");
```

## API Reference

### Server

- `initSRPC()` - Initialize SRPC builder
- `srpcFetchApi(options)` - Create Fetch API handler
- `createSrpcServer(options)` - Create Node.js HTTP server
- `createSRPCCaller(options)` - Create server-side caller

### Client

- `createSRPCClient<TRouter>(options)` - Create type-safe client

### Shared

- `SRPCError` - Error class with HTTP status mapping
- `ErrorCodes` - Available error codes
- `Serializer` - Serialization interface
- `InferRouterInputs<TRouter>` - Extract input types
- `InferRouterOutputs<TRouter>` - Extract output types

## Error Codes

- `BAD_REQUEST` → HTTP 400
- `UNAUTHORIZED` → HTTP 401
- `FORBIDDEN` → HTTP 403
- `NOT_FOUND` → HTTP 404
- `UNSUPPORTED_MEDIA_TYPE` → HTTP 415
- `INTERNAL_SERVER_ERROR` → HTTP 500
- `NOT_IMPLEMENTED` → HTTP 501
- `GENERIC_ERROR` → HTTP 500

## License

MIT
