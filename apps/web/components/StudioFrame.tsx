'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import UxFrame from '@/components/UxFrame';

type StudioFrameProps = {
  src: string;
  title?: string;
  stepLabel?: string;
};

const STUDIO_NAV = [
  { label: 'Meus Projetos', href: '/clients' },
  { label: 'Biblioteca', href: '/clients/azul/library' },
];

function isActive(pathname: string, href: string) {
  return pathname === href;
}

export default function StudioFrame({ src, title, stepLabel }: StudioFrameProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams?.toString();
  const srcWithQuery = query && !src.includes('?') ? `${src}?${query}` : src;

  const topbarLeft = (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl text-slate-900">Creative Studio</h1>
        {stepLabel ? (
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-orange-50 px-2 py-1 rounded">
            {stepLabel}
          </span>
        ) : null}
      </div>
      <nav className="hidden md:flex items-center gap-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {STUDIO_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? 'text-primary' : 'hover:text-slate-700'}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <AppShell
      title={title ?? 'Creative Studio'}
      topbarLeft={topbarLeft}
    >
      <div className="flex-1 min-h-0">
        <UxFrame title={title ?? 'Creative Studio'} src={srcWithQuery} className="h-full w-full border-0" />
      </div>
    </AppShell>
  );
}
