import React from 'react';

import { cn } from '../utils/cn';

export type TextareaProps = React.ComponentPropsWithoutRef<'textarea'> & {
  invalid?: boolean;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
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

Textarea.displayName = 'Textarea';
