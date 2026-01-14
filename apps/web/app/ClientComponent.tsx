"use client";
import { type ReactElement } from "react";
import { useState } from "react";
import { useSRPC } from "#rpc";
import { useQuery } from "@tanstack/react-query";

const ClientComponent = (): ReactElement => {
  const [userId, setUserId] = useState(1);

  const srpc = useSRPC();

  const { data } = useQuery(srpc.users.getUser.queryOptions(userId));

  return (
    <div>
      <h2>User data</h2>
      <pre>
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>

      <button type="button" onClick={() => setUserId((prev) => prev + 1)}>
        Fetch next user
      </button>
    </div>
  );
};

export default ClientComponent;
