'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type JarvisContextValue = {
  isOpen: boolean;
  open: (clientId?: string) => void;
  close: () => void;
  toggle: () => void;
  clientId: string | null;
  setClientId: (id: string) => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  unreadCount: number;
  bump: () => void;
  clearUnread: () => void;
};

const JarvisContext = createContext<JarvisContextValue | null>(null);

export function useJarvis() {
  const ctx = useContext(JarvisContext);
  if (!ctx) throw new Error('useJarvis must be used within JarvisProvider');
  return ctx;
}

export function JarvisProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [clientId, setClientIdState] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-detect clientId from URL /clients/[id]/...
  useEffect(() => {
    const match = pathname?.match(/\/clients\/([^\/]+)/);
    const urlClientId = match?.[1] ?? null;
    if (urlClientId) {
      setClientIdState(urlClientId);
      return;
    }
    // Fallback: localStorage
    try {
      const stored = localStorage.getItem('edro_active_client_id');
      if (stored) setClientIdState(stored);
    } catch { /* ignore */ }
  }, [pathname]);

  const open = useCallback((id?: string) => {
    if (id) setClientIdState(id);
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

  const setClientId = useCallback((id: string) => {
    setClientIdState(id);
    try { localStorage.setItem('edro_active_client_id', id); } catch { /* ignore */ }
  }, []);

  const bump = useCallback(() => {
    setUnreadCount(prev => prev + 1);
  }, []);

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  return (
    <JarvisContext.Provider value={{
      isOpen, open, close, toggle,
      clientId, setClientId,
      conversationId, setConversationId,
      unreadCount, bump, clearUnread,
    }}>
      {children}
    </JarvisContext.Provider>
  );
}
