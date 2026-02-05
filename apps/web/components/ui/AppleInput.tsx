import { InputHTMLAttributes, forwardRef } from 'react';

export interface AppleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: string;
  rightIcon?: string;
  fullWidth?: boolean;
}

const AppleInput = forwardRef<HTMLInputElement, AppleInputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const containerWidth = fullWidth ? 'w-full' : '';

    const inputBaseClasses =
      'font-sans text-base px-4 py-2.5 rounded-xl border transition-all duration-200 ease-apple focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-card-strong disabled:cursor-not-allowed';

    const inputStateClasses = error
      ? 'border-error text-error-dark bg-error-light focus:ring-error-light'
      : 'border-border text-ink bg-card hover:border-border';

    const inputPaddingClasses = leftIcon ? 'pl-11' : rightIcon ? 'pr-11' : '';

    return (
      <div className={`${containerWidth} ${className}`}>
        {label && (
          <label className="block text-sm font-semibold text-muted mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-muted">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={`${inputBaseClasses} ${inputStateClasses} ${inputPaddingClasses} w-full`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-muted">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-error-dark flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-2 text-xs text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

AppleInput.displayName = 'AppleInput';

export default AppleInput;
