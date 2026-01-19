import React from 'react';

import { cn } from '../utils/cn';

export type InputProps = React.ComponentPropsWithoutRef<'input'> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-secondary-lilac/40 bg-surface-light px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-surface-dark dark:text-white',
        invalid && 'border-red-300 focus:ring-red-200',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';
