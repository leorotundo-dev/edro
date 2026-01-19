import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'gray';
  size?: 'sm' | 'md';
  soft?: boolean;
  children?: ReactNode;
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  primary: 'bg-gradient-to-br from-lavender-light via-primary-200 to-primary-50 text-primary-800 shadow-[0_10px_20px_-10px_rgba(147,51,234,0.8)]',
  success: 'bg-sky-light text-slate-900',
  warning: 'bg-accent-gold text-slate-800',
  danger: 'bg-coral-light text-coral-dark',
  gray: 'bg-white text-slate-700 shadow-[0_10px_25px_-15px_rgba(15,23,42,0.2)]'
};

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm'
};

export function Badge({
  variant = 'primary',
  size = 'md',
  soft,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        soft ? 'bg-opacity-30 text-inherit' : variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
