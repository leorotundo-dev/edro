import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  muted?: boolean;
  bordered?: boolean;
  bleed?: boolean;
}

const paddingMap: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      padding = 'md',
      hover,
      muted,
      bordered = true,
      bleed,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl bg-white shadow-sm transition-shadow',
          bordered && 'border border-slate-100',
          hover && 'hover:shadow-lg',
          muted && 'bg-slate-50',
          bleed ? 'p-0' : paddingMap[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
