import { ButtonHTMLAttributes, forwardRef } from 'react';

export type AppleButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
export type AppleButtonSize = 'sm' | 'md' | 'lg';

export interface AppleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppleButtonVariant;
  size?: AppleButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

const AppleButton = forwardRef<HTMLButtonElement, AppleButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      fullWidth = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-xl transition-all duration-200 ease-apple disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
      primary:
        'bg-primary text-white shadow-sm hover:bg-primary-600 active:bg-primary-700 active:scale-[0.98]',
      secondary:
        'bg-card-strong text-ink shadow-sm hover:bg-card-strong active:bg-gray-300 active:scale-[0.98]',
      tertiary:
        'bg-transparent text-primary border border-border hover:border-primary-300 hover:bg-primary-50 active:scale-[0.98]',
      danger:
        'bg-error text-white shadow-sm hover:bg-error-dark active:bg-error-dark active:scale-[0.98]',
      ghost: 'bg-transparent text-muted hover:bg-card-strong active:bg-card-strong active:scale-[0.98]',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-6 py-3.5 text-lg',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && (
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        )}
      </button>
    );
  }
);

AppleButton.displayName = 'AppleButton';

export default AppleButton;
