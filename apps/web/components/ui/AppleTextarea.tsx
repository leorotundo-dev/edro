import { TextareaHTMLAttributes, forwardRef } from 'react';

export interface AppleTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

const AppleTextarea = forwardRef<HTMLTextAreaElement, AppleTextareaProps>(
  (
    {
      label,
      error,
      hint,
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const containerWidth = fullWidth ? 'w-full' : '';

    const textareaBaseClasses =
      'font-sans text-base px-4 py-2.5 rounded-xl border transition-all duration-200 ease-apple focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-card-strong disabled:cursor-not-allowed resize-none';

    const textareaStateClasses = error
      ? 'border-error text-error-dark bg-error-light focus:ring-error-light'
      : 'border-border text-ink bg-card hover:border-border';

    return (
      <div className={`${containerWidth} ${className}`}>
        {label && (
          <label className="block text-sm font-semibold text-muted mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`${textareaBaseClasses} ${textareaStateClasses} w-full`}
          {...props}
        />
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

AppleTextarea.displayName = 'AppleTextarea';

export default AppleTextarea;
