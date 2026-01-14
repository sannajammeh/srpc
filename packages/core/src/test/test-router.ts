import { initSRPC } from "../server";
import { SRPCError } from "../shared";

const s = initSRPC();

// Context type for context-aware tests
export type TestContext = { userId: string };

const user = {
  id: 1,
  name: "John Doe",
  email: "john@doe.com",
};

export const nestedRouter = s.router({
  nestedFn: async (_, id: number) => {
    return {
      message: `I am nested with id ${id}`,
    };
  },
});

const adminRouter = s.router({
  createUser: async (_, id: number) => {
    return {
      ...user,
      id,
    };
  },
});

export const usersRouter = s.router({
  getUser: async (_, id: number) => {
    return {
      ...user,
      id,
    };
  },
  admin: adminRouter,
});

export const appRouterTest = s.router({
  sayHello: async (_, name: string) => {
    return "Hello " + name;
  },
  failingProcedure: async () => {
    throw new SRPCError("This always fails", "BAD_REQUEST");
  },
  users: usersRouter,
});

export type TestRouter = typeof appRouterTest;

// Context-aware router for testing createContext
const sCtx = s.context<TestContext>();

export const appRouterWithContext = sCtx.router({
  sayHello: async (_, name: string) => "Hello " + name,
  whoami: async (ctx) => ctx.userId,
  failingProcedure: async () => {
    throw new SRPCError("This always fails", "BAD_REQUEST");
  },
});

export type TestRouterWithContext = typeof appRouterWithContext;
