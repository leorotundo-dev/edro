'use client';

import Link from 'next/link';

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/estudar', label: 'Estudar', icon: 'play_arrow' },
  { href: '/materias', label: 'Materias', icon: 'style' },
  { href: '/perfil', label: 'Perfil', icon: 'person' },
];

const filledIconStyle = {
  fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
} as const;

export function StitchBottomNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="fixed bottom-0 w-full max-w-md bg-surface-light/90 backdrop-blur-md border-t border-purple-100 px-6 pb-6 pt-3 flex justify-between items-center z-50">
      {NAV_ITEMS.map((item) => {
        const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors group ${
              isActive ? 'text-primary' : 'text-slate-400 hover:text-primary/70'
            }`}
          >
            <div className="relative">
              <span
                className="material-symbols-outlined !text-[26px] group-hover:scale-110 transition-transform"
                style={isActive ? filledIconStyle : undefined}
              >
                {item.icon}
              </span>
              {isActive ? (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              ) : null}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
