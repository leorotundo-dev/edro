import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

const VARIANTS = {
  primary:
    'bg-gradient-to-br from-lavender-light via-primary-500 to-primary-600 text-white shadow-[0_20px_40px_-20px_rgba(99,102,241,0.7)] hover:opacity-95 focus-visible:ring-primary-200',
  secondary:
    'bg-slate-50 text-slate-900 shadow focus-visible:ring-slate-200',
  outline:
    'border border-primary-200 text-primary-600 hover:bg-primary-50 focus-visible:ring-primary-200',
  ghost:
    'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-200',
  danger:
    'bg-gradient-to-br from-coral-light to-coral text-white shadow focus-visible:ring-coral',
  success:
    'bg-gradient-to-br from-sky-light to-sky text-white shadow focus-visible:ring-sky'
} as const;

const SIZES = {
  xs: 'px-3 py-1 text-xs',
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base'
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth,
      loading,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const spinnerClass = variant === 'secondary' || variant === 'ghost' || variant === 'outline'
      ? 'border-primary-500 border-t-transparent'
      : 'border-white/70 border-t-transparent';

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
          VARIANTS[variant],
          SIZES[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span
            className={cn(
              'h-4 w-4 animate-spin rounded-full border-2',
              spinnerClass
            )}
          />
        )}
        {leftIcon}
        <span className="inline-flex items-center gap-1">{children}</span>
        {rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
