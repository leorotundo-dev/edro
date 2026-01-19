import { forwardRef, type ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { LinkComponent, LinkComponentProps, NavSection } from './types';

export interface SidebarProps {
  sections: NavSection[];
  currentPath?: string;
  LinkComponent?: LinkComponent;
  header?: ReactNode;
  footer?: ReactNode;
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
DefaultLink.displayName = 'SidebarDefaultLink';

export function Sidebar({
  sections,
  currentPath,
  LinkComponent = DefaultLink,
  header,
  footer,
  onLinkClick,
  className
}: SidebarProps) {
  return (
    <aside className={cn('flex h-full flex-col bg-white', className)}>
      {header && <div className="border-b border-slate-100 px-4 py-4">{header}</div>}
      <nav className="flex-1 space-y-6 px-3 py-4 text-sm">
        {sections.map((section) => (
          <div key={section.title ?? section.items[0]?.href}>
            {section.title && (
              <div className="px-3 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {section.title}
                </p>
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
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
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    {Icon && (
                      <Icon
                        className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-primary-600' : 'text-slate-400')}
                      />
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {item.badge}
                      </span>
                    )}
                  </LinkComponent>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {footer && <div className="border-t border-slate-100 px-4 py-4 text-sm text-slate-500">{footer}</div>}
    </aside>
  );
}
