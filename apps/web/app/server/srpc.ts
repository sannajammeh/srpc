import { initSRPC } from "@srpc/core/server";

export const s = initSRPC();

const postsRouter = s.router({
  getPost: async (_, id: number) => {
    const json = await fetch(
      `https://jsonplaceholder.typicode.com/posts/${id}`
    ).then((r) => r.json());

    return json as { title: string; body: string };
  },
});

export const appRouter = s.router({
  getUser: async (_, userId: number, name: "did") => {
    const json = await fetch(
      `https://jsonplaceholder.typicode.com/users/${userId}`
    ).then((r) => r.json());

    return json as User;
  },
  posts: postsRouter,
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
