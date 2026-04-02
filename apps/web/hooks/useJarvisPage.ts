'use client';

import { useEffect, type DependencyList } from 'react';
import { useJarvis } from '@/contexts/JarvisContext';

/**
 * Register screen data with Jarvis so it has full context about what the user sees.
 * Data is cleared automatically when the component unmounts.
 *
 * Pass `deps` to re-register when data changes (same as useEffect deps).
 * Omitting deps registers once on mount only.
 */
export function useJarvisPage(data: Record<string, any>, deps?: DependencyList) {
  const { setPageData } = useJarvis();

  useEffect(() => {
    setPageData(data);
    return () => { setPageData(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ?? []);
}
