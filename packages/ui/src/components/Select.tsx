import React from 'react';

import { cn } from '../utils/cn';

export type SelectProps = React.ComponentPropsWithoutRef<'select'> & {
  invalid?: boolean;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-secondary-lilac/40 bg-surface-light px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-surface-dark dark:text-white',
        invalid && 'border-red-300 focus:ring-red-200',
        className
      )}
      {...props}
    />
  )
);

Select.displayName = 'Select';
