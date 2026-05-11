"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch, clearToken, getToken } from "./api";

export type Me = { id: number; username: string; role: "admin" | "user" };

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

export function useMe(): Me | null {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    (async () => {
      const res = await apiFetch("/api/me");
      if (!res.ok) {
        clearToken();
        router.replace("/login");
        return;
      }
      setMe((await res.json()) as Me);
    })();
  }, [router]);

  return me;
}

export function useRequireAdmin(): Me | null {
  const router = useRouter();
  const me = useMe();
  useEffect(() => {
    if (me && me.role !== "admin") {
      router.replace("/");
    }
  }, [me, router]);
  return me && me.role === "admin" ? me : null;
}
