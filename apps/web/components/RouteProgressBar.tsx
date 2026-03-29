'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import LinearProgress from '@mui/material/LinearProgress';

function ProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const completedRef = useRef(`${pathname}?${searchParams}`);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect when route change completes
  useEffect(() => {
    const current = `${pathname}?${searchParams}`;
    if (completedRef.current !== current) {
      completedRef.current = current;
      setLoading(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [pathname, searchParams]);

  // Detect when a navigation starts (intercept link clicks)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      // Only internal navigations
      if (!href || !href.startsWith('/') || href === pathname) return;
      // Ignore new tab / modifier keys
      if (e.metaKey || e.ctrlKey || e.shiftKey || anchor.target === '_blank') return;

      setLoading(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      // Safety valve: clear if navigation never completes
      timerRef.current = setTimeout(() => setLoading(false), 15_000);
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  if (!loading) return null;

  return (
    <LinearProgress
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2000,
        height: 3,
        '& .MuiLinearProgress-bar': { bgcolor: '#E85219' },
        bgcolor: 'transparent',
      }}
    />
  );
}

// useSearchParams requires Suspense in Next.js App Router
export default function RouteProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressInner />
    </Suspense>
  );
}
