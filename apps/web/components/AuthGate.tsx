'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type AuthGateProps = {
  children: React.ReactNode;
};

const PUBLIC_PATHS = new Set(['/login']);
const PUBLIC_PREFIXES = ['/calendar', '/edro/aprovacao-externa', '/proposta', '/portal', '/portal/approval'];

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [ready, setReady] = useState(false);
  const isPublicPath =
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    let cancelled = false;

    if (isPublicPath) {
      setReady(true);
      return;
    }

    const validateSession = async () => {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!res.ok) {
        localStorage.removeItem('edro_user');
        const nextParam = encodeURIComponent(pathname);
        router.replace(`/login?next=${nextParam}`);
        return;
      }

      const data = await res.json();
      if (!cancelled && data?.user) {
        localStorage.setItem('edro_user', JSON.stringify(data.user));
        setReady(true);
      }
    };

    void validateSession();
    return () => { cancelled = true; };
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
