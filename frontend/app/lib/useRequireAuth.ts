"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getToken } from "./api";

export function useRequireAuth(): boolean {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  return ready;
}
