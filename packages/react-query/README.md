# @srpc/react-query

React Query integration for SRPC - Type-safe RPC with automatic React Query hooks and query/mutation options generation.

## Installation

```bash
# Using JSR (recommended)
deno add @srpc/react-query
npx jsr add @srpc/react-query
yarn dlx jsr add @srpc/react-query
pnpm dlx jsr add @srpc/react-query
bunx jsr add @srpc/react-query
```

## Features

- **Automatic React Query Integration**: Transform SRPC procedures into React Query options
- **Type-safe Hooks**: Full TypeScript support with automatic type inference
- **React Context Support**: Easy setup with Context API for app-wide RPC access
- **Query & Mutation Options**: Automatic generation of `queryOptions` and `mutationOptions`
- **Nested Router Support**: Works seamlessly with nested SRPC routers
- **Zero Configuration**: Works out of the box with TanStack React Query v5+

## Prerequisites

This package requires:
- `@srpc/core` - The core SRPC framework
- `@tanstack/react-query` v5.90 or higher
- `react` v19 or higher

## Quick Start

### 1. Define Your Server Router

```typescript
// server/router.ts
import { initSRPC } from "@srpc/core/server";

const s = initSRPC();

export const appRouter = s.router({
  sayHello: async (_, name: string) => {
    return `Hello ${name}!`;
  },
  users: s.router({
    getUser: async (_, id: number) => {
      return { id, name: "John Doe", email: "john@example.com" };
    },
    createUser: async (_, data: { name: string; email: string }) => {
      return { id: 1, ...data };
    },
  }),
});

export type AppRouter = typeof appRouter;
```

### 2. Create SRPC Client and Context

```typescript
// lib/rpc.ts
import { createSRPCClient } from "@srpc/core/client";
import { createSRPCContext } from "@srpc.org/react-query";
import type { AppRouter } from "../server/router";

// Create SRPC client
export const rpcClient = createSRPCClient<AppRouter>({
  endpoint: "/api/srpc",
});

// Create React context, provider, and hooks
export const { SRPCProvider, useSRPC, useSRPCClient } =
  createSRPCContext<AppRouter>();
```

### 3. Setup Providers

```typescript
// app/providers.tsx
"use client";

import { rpcClient, SRPCProvider } from "@/lib/rpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SRPCProvider client={rpcClient}>
        {children}
      </SRPCProvider>
    </QueryClientProvider>
  );
}
```

### 4. Use in Components

```typescript
// components/UserProfile.tsx
"use client";

import { useSRPC } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

export function UserProfile({ userId }: { userId: number }) {
  const srpc = useSRPC();

  // Get React Query options for the procedure
  const userQuery = useQuery(srpc.users.getUser.queryOptions(userId));

  if (userQuery.isLoading) return <div>Loading...</div>;
  if (userQuery.error) return <div>Error: {userQuery.error.message}</div>;

  return (
    <div>
      <h2>{userQuery.data.name}</h2>
      <p>{userQuery.data.email}</p>
    </div>
  );
}
```

## Usage Patterns

### Using Queries

```typescript
import { useSRPC } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

function MyComponent() {
  const srpc = useSRPC();

  // Basic query
  const { data, isLoading, error } = useQuery(
    srpc.users.getUser.queryOptions(1)
  );

  // Query with options
  const userQuery = useQuery({
    ...srpc.users.getUser.queryOptions(userId),
    staleTime: 5000,
    refetchInterval: 10000,
  });

  return <div>{data?.name}</div>;
}
```

### Using Mutations

```typescript
import { useSRPC } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function CreateUserForm() {
  const srpc = useSRPC();
  const queryClient = useQueryClient();

  const createUser = useMutation({
    ...srpc.users.createUser.mutationOptions(),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createUser.mutate({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" />
      <input name="email" type="email" placeholder="Email" />
      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? "Creating..." : "Create User"}
      </button>
      {createUser.error && <p>Error: {createUser.error.message}</p>}
    </form>
  );
}
```

### Direct Client Access

If you need to call procedures outside of React Query:

```typescript
import { useSRPCClient } from "@/lib/rpc";

function MyComponent() {
  const client = useSRPCClient();

  const handleClick = async () => {
    // Direct RPC call without React Query
    const result = await client.sayHello("World");
    console.log(result); // "Hello World!"
  };

  return <button onClick={handleClick}>Say Hello</button>;
}
```

### Nested Routers

The integration works seamlessly with nested routers:

```typescript
const srpc = useSRPC();

// Access nested procedures
const userQuery = useQuery(srpc.users.getUser.queryOptions(1));
const adminQuery = useQuery(srpc.users.admin.getStats.queryOptions());
const postQuery = useQuery(srpc.posts.drafts.list.queryOptions());
```

### Using Without React Context

If you prefer not to use React Context:

```typescript
import { createSRPCClient } from "@srpc/core/client";
import { createSRPCQueryOptions } from "@srpc.org/react-query";
import { useQuery } from "@tanstack/react-query";
import type { AppRouter } from "./server/router";

// Create client
const client = createSRPCClient<AppRouter>({
  endpoint: "/api/srpc",
});

// Create query options
const srpc = createSRPCQueryOptions({ client });

// Use directly in components
function MyComponent() {
  const { data } = useQuery(srpc.users.getUser.queryOptions(1));
  return <div>{data?.name}</div>;
}
```

## Advanced Usage

### Custom Serialization

```typescript
import { createSRPCClient } from "@srpc/core/client";
import { createSRPCContext } from "@srpc.org/react-query";
import superjson from "superjson";

const client = createSRPCClient<AppRouter>({
  endpoint: "/api/srpc",
  transformer: {
    serialize: (value) => superjson.stringify(value),
    deserialize: (value) => superjson.parse(value),
  },
});

export const { SRPCProvider, useSRPC } = createSRPCContext<AppRouter>();
```

### Authentication Headers

```typescript
const client = createSRPCClient<AppRouter>({
  endpoint: "/api/srpc",
  headers: async () => {
    const token = await getAuthToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  },
});
```

### Optimistic Updates

```typescript
const updateUser = useMutation({
  ...srpc.users.updateUser.mutationOptions(),
  onMutate: async (newUser) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["users", newUser.id] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(["users", newUser.id]);

    // Optimistically update
    queryClient.setQueryData(["users", newUser.id], newUser);

    return { previous };
  },
  onError: (err, newUser, context) => {
    // Rollback on error
    queryClient.setQueryData(["users", newUser.id], context?.previous);
  },
  onSettled: (data, error, variables) => {
    // Refetch after success or error
    queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
  },
});
```

## API Reference

### createSRPCContext<TRouter>()

Creates a React context and related hooks for SRPC with React Query integration.

**Returns:**
- `SRPCContext` - React Context object
- `SRPCProvider` - Provider component that accepts `client` prop
- `useSRPC()` - Hook that returns decorated procedures with `.queryOptions()` and `.mutationOptions()`
- `useSRPCClient()` - Hook that returns the raw SRPC client for direct calls

### createSRPCQueryOptions({ client })

Transforms an SRPC client into an object with React Query options accessors.

**Parameters:**
- `client` - DecoratedProcedureRecord from `createSRPCClient`

**Returns:**
- Decorated procedures where each procedure has:
  - `.queryOptions(...args)` - Returns `UseQueryOptions` for `useQuery`
  - `.mutationOptions()` - Returns `UseMutationOptions` for `useMutation`

### useSRPC()

Hook to access decorated SRPC procedures with React Query options.

**Must be used within `<SRPCProvider>`**

**Returns:**
- Decorated procedures with `.queryOptions()` and `.mutationOptions()` methods

### useSRPCClient()

Hook to access the raw SRPC client for direct procedure calls.

**Must be used within `<SRPCProvider>`**

**Returns:**
- Raw SRPC client with direct procedure methods

## TypeScript Support

All functions and hooks are fully typed with automatic type inference:

```typescript
// Types are automatically inferred from your router
const srpc = useSRPC();

// TypeScript knows the input types
const query = srpc.users.getUser.queryOptions(1); // ✓ number expected

// And the output types
const { data } = useQuery(query);
// data is typed as { id: number; name: string; email: string }

// Type errors are caught at compile time
srpc.users.getUser.queryOptions("invalid"); // ✗ Type error
```

## Examples

See the [web app example](../../apps/web) for a complete working implementation with:
- Server setup with SRPC
- Client configuration
- Provider setup
- Component usage patterns
- Server Components integration

## License

MIT
