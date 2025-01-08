import { initSRPC } from "../server";

const s = initSRPC();

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
  users: usersRouter,
});

export type TestRouter = typeof appRouterTest;
