"use client";

import type { AnySRPC } from "@srpc/core/server";
import type { DecoratedProcedureRecord } from "@srpc/core/shared";
import React, {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import {
  createSRPCQueryOptions,
  type DecoratedQueryProcedureRecord,
} from "./mod";

export interface SRPCContextValue<TRouter extends AnySRPC> {
  client: DecoratedProcedureRecord<TRouter["ipc"]>;
  srpc: DecoratedQueryProcedureRecord<TRouter["ipc"]>;
}

export type SRPCContextFactory<TRouter extends AnySRPC> = {
  SRPCContext: React.Context<SRPCContextValue<TRouter>>;
  SRPCProvider: ({
    children,
    client,
  }: PropsWithChildren<{
    client: DecoratedProcedureRecord<TRouter["ipc"]>;
  }>) => React.JSX.Element;
  useSRPC: () => DecoratedQueryProcedureRecord<TRouter["ipc"]>;
  useSRPCClient: () => DecoratedProcedureRecord<TRouter["ipc"]>;
};

export function createSRPCContext<
  TRouter extends AnySRPC,
>(): SRPCContextFactory<TRouter> {
  // biome-ignore lint/style/noNonNullAssertion: <Asserting non null for context>
  const SRPCContext = createContext<SRPCContextValue<TRouter>>(null!);

  function SRPCProvider({
    children,
    client,
  }: PropsWithChildren<{
    client: DecoratedProcedureRecord<TRouter["ipc"]>;
  }>) {
    const srpc = useMemo(() => {
      return createSRPCQueryOptions({
        client: client,
      });
    }, [client]);

    return (
      <SRPCContext.Provider value={{ client: client, srpc }}>
        {children}
      </SRPCContext.Provider>
    );
  }

  function useSRPC() {
    const ctx = useContext(SRPCContext);
    if (!ctx) {
      throw new Error("useSRPC must be used within a SRPCProvider");
    }

    return ctx.srpc;
  }

  function useSRPCClient() {
    const ctx = useContext(SRPCContext);
    if (!ctx) {
      throw new Error("useSRPCClient must be used within a SRPCProvider");
    }

    return ctx.client;
  }

  return {
    SRPCContext,
    SRPCProvider,
    useSRPC,
    useSRPCClient,
  };
}
