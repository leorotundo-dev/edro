import { HTMLAttributes, ReactNode } from 'react';

export interface AppleCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  noPadding?: boolean;
  hoverable?: boolean;
  border?: boolean;
}

export default function AppleCard({
  title,
  subtitle,
  action,
  noPadding = false,
  hoverable = false,
  border = true,
  className = '',
  children,
  ...props
}: AppleCardProps) {
  const baseClasses = 'bg-card rounded-2xl shadow-sm transition-all duration-200 ease-apple';
  const borderClasses = border ? 'border border-border' : '';
  const hoverClasses = hoverable ? 'hover:shadow-md hover:scale-[1.01] cursor-pointer' : '';
  const paddingClasses = noPadding ? '' : 'p-6';

  return (
    <div className={`${baseClasses} ${borderClasses} ${hoverClasses} ${paddingClasses} ${className}`} {...props}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {title && <h3 className="font-display text-xl font-semibold text-ink mb-1">{title}</h3>}
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          {action && <div className="ml-4">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
