"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("edro_token") : null;
    if (token) {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return null;
}
