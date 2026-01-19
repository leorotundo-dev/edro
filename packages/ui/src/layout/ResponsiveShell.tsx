"use client";

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '../utils/cn';
// @ts-ignore: allow side-effect import of CSS without type declarations
import './ResponsiveShell.css';

interface ShellControls {
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

type SlotContent = ReactNode | ((controls: ShellControls) => ReactNode);

export interface ResponsiveShellProps {
  children: ReactNode;
  sidebar: SlotContent;
  brand?: {
    name?: string;
    subtitle?: string;
    icon?: ReactNode;
  };
  currentPath?: string;
  headerContent?: ReactNode;
  bottomNav?: SlotContent;
  sidebarClassName?: string;
  contentClassName?: string;
  bodyClassName?: string;
  desktopBreakpoint?: number;
  sidebarWidth?: number;
}

const DEFAULT_BREAKPOINT = 1024;
const DEFAULT_SIDEBAR_WIDTH = 256;

export function ResponsiveShell({
  children,
  sidebar,
  brand,
  currentPath,
  headerContent,
  bottomNav,
  sidebarClassName,
  contentClassName,
  bodyClassName,
  desktopBreakpoint = DEFAULT_BREAKPOINT,
  sidebarWidth = DEFAULT_SIDEBAR_WIDTH
}: ResponsiveShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const update = () => {
      const isWide = window.innerWidth >= desktopBreakpoint;
      setIsDesktop(isWide);
      setSidebarOpen(isWide);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [desktopBreakpoint]);

  useEffect(() => {
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  }, [currentPath, isDesktop]);

  // Update a CSS variable on the document root so sizing lives in CSS file
  useEffect(() => {
    try {
      document.documentElement.style.setProperty('--rs-sidebar-width', `${sidebarWidth}px`);
    } catch {
      // ignore in non-browser environments
    }
  }, [sidebarWidth]);

  const controls = useMemo<ShellControls>(() => ({
    openSidebar: () => setSidebarOpen(true),
    closeSidebar: () => setSidebarOpen(false),
    toggleSidebar: () => setSidebarOpen((prev) => !prev)
  }), []);

  const renderSlot = (slot?: SlotContent) => {
    if (!slot) return null;
    return typeof slot === 'function' ? slot(controls) : slot;
  };

  const brandName = brand?.name ?? 'Edro';
  const brandSubtitle = brand?.subtitle ?? 'Workspace';
  const brandIcon = brand?.icon ?? (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-500 text-lg font-bold text-white">
      {brandName.charAt(0)}
    </div>
  );

  return (
    <div className={cn('min-h-screen bg-slate-50 overflow-x-hidden', bodyClassName, isDesktop ? 'rs-desktop' : 'rs-mobile')}>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={controls.toggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 lg:hidden"
            aria-label="Abrir menu"
          >
            {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          <div className="flex items-center gap-3">
            {brandIcon}
            <div>
              <p className="text-sm font-semibold text-slate-900">{brandName}</p>
              <p className="text-xs text-slate-500">{brandSubtitle}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">{headerContent}</div>
      </header>

      {sidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          role="presentation"
          onClick={controls.closeSidebar}
        />
      )}

      <aside
        className={cn(
          'fixed top-16 bottom-0 z-40 bg-white shadow-lg transition-transform duration-300 lg:top-0 lg:bottom-0 lg:shadow-none rs-aside',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          sidebarClassName
        )}
      >
        <div className="h-full overflow-y-auto border-r border-slate-100 lg:border-transparent">
          {renderSlot(sidebar)}
        </div>
      </aside>

      <main
        className={cn(
          'px-4 pb-24 pt-20 transition-[margin] lg:px-10 lg:pb-12 lg:pt-8 rs-main',
          contentClassName
        )}
      >
        {children}
      </main>

      {bottomNav && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white shadow-[0_-8px_30px_rgba(15,23,42,0.12)] lg:hidden">
          {renderSlot(bottomNav)}
        </div>
      )}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
