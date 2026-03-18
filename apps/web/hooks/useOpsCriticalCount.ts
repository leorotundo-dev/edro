'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

const CLOSED = new Set(['published', 'done', 'archived']);

let _cached = 0;
let _lastFetch = 0;
const INTERVAL_MS = 90_000; // re-fetch every 90s

export function useOpsCriticalCount() {
  const [count, setCount] = useState(_cached);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiGet<{ data: { id: string; status: string; is_urgent: boolean; priority_band: string; owner_id: string | null }[] }>('/jobs?active=true');
        if (!res?.data) return;
        const c = new Set(
          res.data
            .filter((j) => !CLOSED.has(j.status) && (j.status === 'blocked' || j.is_urgent || (j.priority_band === 'p0' && !j.owner_id)))
            .map((j) => j.id)
        ).size;
        _cached = c;
        _lastFetch = Date.now();
        setCount(c);
      } catch {
        // silently ignore — badge is non-critical
      }
    };

    if (Date.now() - _lastFetch > INTERVAL_MS) {
      load();
    } else {
      setCount(_cached);
    }

    const timer = setInterval(load, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return count;
}
