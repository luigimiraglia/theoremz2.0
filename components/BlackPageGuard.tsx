"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function BlackPageGuard() {
  const router = useRouter();
  const { isSubscribed } = useAuth();

  useEffect(() => {
    if (isSubscribed) {
      router.push("/account");
    }
  }, [isSubscribed, router]);

  return null;
}
