import { suite, describe, expect, it } from "vitest";
import { initSRPC, SRPC } from "./api";

suite("SRPC", () => {
  describe("[sanity] - Basic behaviour", () => {
    it("Should be a class instance", () => {
      const sut = new SRPC();

      expect(sut).toBeInstanceOf(SRPC);
    });

    it("Should contain __context and __routes properties", () => {
      const sut = new SRPC({});

      expect("__context" in sut).toBeFalsy();
      expect("__routes" in sut).toBeTruthy();
    });

    it("Should recreate itself when context is set", () => {
      const srpc = new SRPC({});

      const sut = srpc.context();

      expect(sut).toBeInstanceOf(SRPC);
    });

    it("Should recreate itself with new routes when routes() is called", () => {
      const srpc = new SRPC({});

      const sut = srpc.router({ test: async () => {} });

      expect(sut).toBeInstanceOf(SRPC);
    });
  });
});

suite("initSRPC", () => {
  describe("[sanity] - Basic behaviour", () => {
    it("Should return a new instance of SRPC", () => {
      const sut = initSRPC();

      expect(sut).toBeInstanceOf(SRPC);
    });
  });
});
