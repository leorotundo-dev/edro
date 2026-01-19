"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ResponsiveShell } from "@edro/ui";
import { SidebarNav } from "./SidebarNav";

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("edro_token") : null;
    if (!token && pathname.startsWith("/admin")) {
      router.replace("/login");
    }
  }, [router, pathname]);

  return (
    <ResponsiveShell
      brand={{ name: "Edro", subtitle: "Painel Administrativo" }}
      currentPath={pathname}
      sidebar={({ closeSidebar }) => (
        <SidebarNav currentPath={pathname} onNavigate={closeSidebar} />
      )}
      contentClassName="max-w-7xl mx-auto w-full space-y-8"
    >
      {children}
    </ResponsiveShell>
  );
}
