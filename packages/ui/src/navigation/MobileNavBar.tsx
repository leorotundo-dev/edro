import { forwardRef } from 'react';
import { cn } from '../utils/cn';
import type { LinkComponent, LinkComponentProps, NavItem } from './types';

export interface MobileNavBarProps {
  items: NavItem[];
  currentPath?: string;
  LinkComponent?: LinkComponent;
  onLinkClick?: (href: string) => void;
  className?: string;
}

const DefaultLink = forwardRef<HTMLAnchorElement, LinkComponentProps>(
  ({ href, children, className, ...props }, ref) => (
    <a ref={ref} href={href} className={className} {...props}>
      {children}
    </a>
  )
);
DefaultLink.displayName = 'MobileNavDefaultLink';

export function MobileNavBar({
  items,
  currentPath,
  LinkComponent = DefaultLink,
  onLinkClick,
  className
}: MobileNavBarProps) {
  return (
    <nav className={cn('grid grid-cols-4 gap-1 px-2 py-2 text-xs', className)}>
      {items.map((item) => {
        const isActive = currentPath
          ? currentPath === item.href || currentPath.startsWith(`${item.href}/`)
          : false;
        const Icon = item.icon;

        return (
          <LinkComponent
            key={item.href}
            href={item.href}
            onClick={() => onLinkClick?.(item.href)}
            className={cn(
              'flex flex-col items-center rounded-xl px-2 py-2 font-semibold transition-colors',
              isActive ? 'text-primary-600' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {Icon && <Icon className="h-5 w-5" />}
            <span className="mt-1 text-[11px] tracking-tight">{item.label}</span>
          </LinkComponent>
        );
      })}
    </nav>
  );
}
