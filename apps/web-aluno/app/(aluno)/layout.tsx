"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CognitiveStateBridge } from '@/components/CognitiveStateBridge';
import { StitchBottomNav } from '@/components/StitchBottomNav';
import { api, AUTH_EVENT, isAuthenticated } from '@/lib/api';
import {
  applyAccessibilitySettings,
  readStoredAccessibility,
  storeAccessibilitySettings
} from '@/lib/accessibility';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated());

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      setAuthenticated(false);
      router.replace('/login');
      return;
    }

    setAuthenticated(true);
  }, [router]);

  useEffect(() => {
    const handleAuthEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: string }>).detail;
      if (!detail?.action) return;
      const token = api.getToken();
      setAuthenticated(!!token);
      if (!token) {
        router.replace('/login');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(AUTH_EVENT, handleAuthEvent as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(AUTH_EVENT, handleAuthEvent as EventListener);
      }
    };
  }, [router]);

  useEffect(() => {
    const stored = readStoredAccessibility();
    if (stored) {
      applyAccessibilitySettings(stored);
    }

    if (!authenticated) return;
    const token = api.getToken();
    if (!token) return;

    fetch(`${API_URL}/api/accessibility/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.data) return;
        storeAccessibilitySettings(data.data);
        applyAccessibilitySettings(data.data);
      })
      .catch(() => {});
  }, [authenticated]);

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background-light text-slate-900">
      <CognitiveStateBridge />
      <div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto bg-background-light shadow-2xl overflow-hidden pb-24 font-display">
        {children}
        <StitchBottomNav currentPath={pathname} />
      </div>
    </div>
  );
}
