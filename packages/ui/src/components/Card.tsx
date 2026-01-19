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
          'rounded-[1.25rem] bg-gradient-to-br from-white/90 to-slate-50 border border-white/60 shadow-[0_20px_40px_-20px_rgba(99,102,241,0.5)] transition duration-300',
          bordered && 'border border-white/80',
          hover && 'hover:translate-y-0.5 hover:shadow-[0_25px_45px_-20px_rgba(99,102,241,0.6)]',
          muted && 'bg-slate-50/90 shadow-[0_18px_35px_-15px_rgba(15,23,42,0.15)]',
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
