import { HTMLAttributes } from 'react';

export type AppleBadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gray';
export type AppleBadgeSize = 'sm' | 'md' | 'lg';

export interface AppleBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: AppleBadgeVariant;
  size?: AppleBadgeSize;
  icon?: string;
  dot?: boolean;
}

export default function AppleBadge({
  variant = 'gray',
  size = 'md',
  icon,
  dot = false,
  className = '',
  children,
  ...props
}: AppleBadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 font-sans font-semibold rounded-lg';

  const variantClasses = {
    primary: 'bg-primary-50 text-primary-600 border border-primary-200',
    success: 'bg-success-light text-success-dark border border-success',
    warning: 'bg-warning-light text-warning-dark border border-warning',
    error: 'bg-error-light text-error-dark border border-error',
    info: 'bg-info-light text-info-dark border border-info',
    gray: 'bg-card-strong text-muted border border-border',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 'text-[14px]',
    md: 'text-[16px]',
    lg: 'text-[18px]',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} {...props}>
      {dot && <span className={`${dotSizes[size]} rounded-full bg-current`} />}
      {icon && <span className={`material-symbols-outlined ${iconSizes[size]}`}>{icon}</span>}
      {children}
    </span>
  );
}
