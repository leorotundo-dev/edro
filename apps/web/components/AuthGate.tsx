'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type AuthGateProps = {
  children: React.ReactNode;
};

const PUBLIC_PATHS = new Set(['/login']);
const PUBLIC_PREFIXES = ['/calendar'];

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [ready, setReady] = useState(false);
  const isPublicPath =
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    if (isPublicPath) {
      setReady(true);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) {
      const nextParam = encodeURIComponent(pathname);
      router.replace(`/login?next=${nextParam}`);
      return;
    }

    setReady(true);
  }, [isPublicPath, pathname, router]);

  if (!ready && !isPublicPath) {
    return (
      <div className="loading-screen">
        <div className="pulse">Carregando...</div>
      </div>
    );
  }

  return <>{children}</>;
}
