"use client";

import { rpcClient, SRPCProvider } from "#rpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
export default function Layout({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <SRPCProvider client={rpcClient}>{children}</SRPCProvider>
    </QueryClientProvider>
  );
}
