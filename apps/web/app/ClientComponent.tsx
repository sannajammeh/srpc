"use client";
import React, { useEffect, useState } from "react";
import { rpc } from "../rpc";

const ClientComponent = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    rpc.users.getUser(1).then(setUser);
  }, []);
  return (
    <div>
      <pre>
        <code>{JSON.stringify(user, null, 2)}</code>
      </pre>
    </div>
  );
};

export default ClientComponent;
