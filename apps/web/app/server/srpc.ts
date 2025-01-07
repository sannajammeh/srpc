import { initSRPC } from "@srpc/core/server";

export const s = initSRPC();

export const appRouter = s.router({
  getUser: async (_, userId: number) => {
    const json = await fetch(
      `https://jsonplaceholder.typicode.com/users/${userId}`
    ).then((r) => r.json());

    return json as User;
  },
});

export type AppRouter = typeof appRouter;

export type User = {
  id: number;
  name: string;
  username: string;
  email: string;
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: {
      lat: string;
      lng: string;
    };
  };
  phone: string;
  website: string;
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
};
