import { describe, expect, it, vi } from "vitest";

import { createRecursiveProxy } from "./proxy";

interface ProxyTest {
  test: {
    hello: () => void;
  };
}

describe("createRecursiveProxy", () => {
  it("Should call the internal callback with the proxied path", () => {
    const callback = vi.fn();
    const sut = createRecursiveProxy<ProxyTest>(callback);

    sut.test.hello();

    expect(callback).toHaveBeenCalledWith({
      args: [],
      path: ["test", "hello"],
    });
  });

  it("Should correctly handle the toJSON call", () => {
    const callback = vi.fn();
    const sut = createRecursiveProxy<ProxyTest>(callback);
    const json = JSON.stringify(sut.test.hello);

    const expected = {
      __type: "SRPC",
      path: ["test", "hello"],
      pathString: "test.hello",
    };

    expect(JSON.parse(json)).toMatchObject(expected);
  });

  it("Should correctly handle the toString call", () => {
    const callback = vi.fn();
    const sut = createRecursiveProxy<ProxyTest>(callback);

    const str = sut.test.hello.toString();

    expect(str).toEqual("test.hello");

    expect(`${sut.test.hello}`).toEqual("test.hello");
  });
});
