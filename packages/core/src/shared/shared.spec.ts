import { describe, expectTypeOf, it } from "vitest";
import { createSRPCCaller, initSRPC } from "../server";
import type { InferRouterInputs, InferRouterOutputs } from ".";

const s = initSRPC();

const appRouter = s.router({
  test: (ctx, a: number, b: number) => a + b,
  nested: s.router({
    deeperNested: s.router({
      test: (ctx, a: number, b: number) => a + b,
    }),
  }),
});

const rpc = createSRPCCaller({
  router: appRouter,
});

type AppRouter = typeof appRouter;

describe("InferRouterOutputs", () => {
  it("Should infer the correct output type of a router", () => {
    type Expected = number;

    type Actual = InferRouterOutputs<AppRouter>["test"];

    const sut = rpc.test(1, 2);

    const sut2: Actual = sut as Actual;

    expectTypeOf(sut).toEqualTypeOf<Expected>();
    expectTypeOf(sut2).toEqualTypeOf<Expected>();
  });

  it("Should infer the correct output type of a nested router", () => {
    type Expected = number;

    type Actual =
      InferRouterOutputs<AppRouter>["nested"]["deeperNested"]["test"];

    const sut = rpc.nested.deeperNested.test(1, 2);
    const sut2: Actual = sut as Actual;

    expectTypeOf(sut).toEqualTypeOf<Expected>();
    expectTypeOf(sut2).toEqualTypeOf<Expected>();
  });
});

describe("InferRouterInputs", () => {
  it("Should infer the correct input type of a router", () => {
    type Expected = [a: number, b: number];
    const args: Expected = [1, 2];

    type Actual = InferRouterInputs<AppRouter>["test"];

    const sut = args;

    const sut2: Actual = sut as Actual;

    expectTypeOf(sut).toEqualTypeOf<Expected>();
    expectTypeOf(sut2).toEqualTypeOf<Expected>();

    // Parameters must match
    const sut3: Parameters<typeof rpc.test> = args;

    expectTypeOf(sut3).toEqualTypeOf<Actual>();
  });
});
