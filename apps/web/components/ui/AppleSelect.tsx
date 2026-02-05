import { SelectHTMLAttributes, forwardRef } from 'react';

export interface AppleSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

const AppleSelect = forwardRef<HTMLSelectElement, AppleSelectProps>(
  (
    {
      label,
      error,
      hint,
      fullWidth = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const containerWidth = fullWidth ? 'w-full' : '';

    const selectBaseClasses =
      'font-sans text-base px-4 py-2.5 pr-10 rounded-xl border transition-all duration-200 ease-apple focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-card-strong disabled:cursor-not-allowed appearance-none bg-no-repeat bg-right';

    const selectStateClasses = error
      ? 'border-error text-error-dark bg-error-light focus:ring-error-light'
      : 'border-border text-ink bg-card hover:border-border';

    const bgImage =
      'data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e';

    return (
      <div className={`${containerWidth} ${className}`}>
        {label && (
          <label className="block text-sm font-semibold text-muted mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`${selectBaseClasses} ${selectStateClasses} w-full`}
            style={{ backgroundImage: `url("${bgImage}")`, backgroundSize: '1.5em 1.5em', backgroundPosition: 'right 0.5rem center' }}
            {...props}
          >
            {children}
          </select>
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

AppleSelect.displayName = 'AppleSelect';

export default AppleSelect;
