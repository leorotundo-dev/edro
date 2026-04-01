'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { apiGet } from '@/lib/api';

type JarvisContextValue = {
  isOpen: boolean;
  open: (clientId?: string) => void;
  close: () => void;
  toggle: () => void;
  // Command palette
  isPaletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  // Send a pre-filled message: opens drawer + queues message
  openWithMessage: (message: string) => void;
  pendingMessage: string | null;
  clearPendingMessage: () => void;
  // Client / conversation
  clientId: string | null;
  clientName: string | null;
  setClientId: (id: string) => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  unreadCount: number;
  bump: () => void;
  clearUnread: () => void;
  // Page context — auto-detected from URL
  pageContext: { type: 'client' | 'job' | 'global'; id: string | null; label: string | null };
  // Arbitrary page data registered by individual screens (for Jarvis context)
  pageData: Record<string, any> | null;
  setPageData: (data: Record<string, any> | null) => void;
};

const JarvisContext = createContext<JarvisContextValue | null>(null);

export function useJarvis() {
  const ctx = useContext(JarvisContext);
  if (!ctx) throw new Error('useJarvis must be used within JarvisProvider');
  return ctx;
}

function detectPageContext(pathname: string | null): { type: 'client' | 'job' | 'global'; id: string | null; label: string | null } {
  if (!pathname) return { type: 'global', id: null, label: null };
  const jobMatch = pathname.match(/\/admin\/operacoes\/jobs\/([^\/]+)/);
  if (jobMatch) return { type: 'job', id: jobMatch[1], label: null };
  const clientMatch = pathname.match(/\/clients\/([^\/]+)/);
  if (clientMatch) return { type: 'client', id: clientMatch[1], label: null };
  return { type: 'global', id: null, label: null };
}

export function JarvisProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [clientId, setClientIdState] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pageData, setPageData] = useState<Record<string, any> | null>(null);
  const [pageContext, setPageContext] = useState<{ type: 'client' | 'job' | 'global'; id: string | null; label: string | null }>(
    { type: 'global', id: null, label: null }
  );

  // Auto-detect context from URL — clients and jobs
  useEffect(() => {
    const ctx = detectPageContext(pathname);
    setPageContext(ctx);

    if (ctx.type === 'client' && ctx.id) {
      setClientIdState(ctx.id);
      try { localStorage.setItem('edro_active_client_id', ctx.id); } catch { /* ignore */ }
      return;
    }
    if (ctx.type !== 'client') {
      try {
        const stored = localStorage.getItem('edro_active_client_id');
        if (stored) setClientIdState(stored);
      } catch { /* ignore */ }
    }
  }, [pathname]);

  // Load client name whenever clientId changes
  useEffect(() => {
    if (!clientId) { setClientName(null); return; }
    apiGet<{ data?: { client?: { name?: string }; name?: string } }>(`/clients/${clientId}`)
      .then(res => setClientName(res?.data?.client?.name ?? res?.data?.name ?? null))
      .catch(() => setClientName(null));
  }, [clientId]);

  // Load job label when page context is a job
  useEffect(() => {
    if (pageContext.type !== 'job' || !pageContext.id) return;
    apiGet<{ data?: { title?: string; client_name?: string } }>(`/jobs/${pageContext.id}`)
      .then(res => {
        const label = res?.data?.title ?? null;
        const jobClientId = (res?.data as any)?.client_id ?? null;
        setPageContext(prev => ({ ...prev, label }));
        if (jobClientId) setClientIdState(jobClientId);
      })
      .catch(() => {});
  }, [pageContext.type, pageContext.id]);

  // Ctrl+J / Cmd+J — opens command palette (or toggles drawer if palette already open)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        // Don't fire inside text inputs (so typing Ctrl+J in Jarvis chat doesn't reopen palette)
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        if (isPaletteOpen) {
          setIsPaletteOpen(false);
        } else if (isOpen) {
          setIsOpen(false);
        } else {
          setIsPaletteOpen(true);
        }
      }
      // Escape closes palette
      if (e.key === 'Escape' && isPaletteOpen) {
        setIsPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPaletteOpen, isOpen]);

  const open = useCallback((id?: string) => {
    if (id) setClientIdState(id);
    setIsPaletteOpen(false);
    setIsOpen(true);
    setUnreadCount(0);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
  }, []);

  const openPalette = useCallback(() => setIsPaletteOpen(true), []);
  const closePalette = useCallback(() => setIsPaletteOpen(false), []);

  const openWithMessage = useCallback((message: string) => {
    setIsPaletteOpen(false);
    setPendingMessage(message);
    setIsOpen(true);
    setUnreadCount(0);
  }, []);

  const clearPendingMessage = useCallback(() => setPendingMessage(null), []);

  const setClientId = useCallback((id: string) => {
    setClientIdState(id);
    try { localStorage.setItem('edro_active_client_id', id); } catch { /* ignore */ }
  }, []);

  const bump = useCallback(() => setUnreadCount(prev => prev + 1), []);
  const clearUnread = useCallback(() => setUnreadCount(0), []);

  return (
    <JarvisContext.Provider value={{
      isOpen, open, close, toggle,
      isPaletteOpen, openPalette, closePalette,
      openWithMessage, pendingMessage, clearPendingMessage,
      clientId, clientName, setClientId,
      conversationId, setConversationId,
      unreadCount, bump, clearUnread,
      pageData, setPageData,
      pageContext,
      pageData, setPageData,
    }}>
      {children}
    </JarvisContext.Provider>
  );
}
