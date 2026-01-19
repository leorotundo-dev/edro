import type { ComponentType } from 'react';
import { cn } from '../utils/cn';

const toneStyles = {
  blue: {
    wrapper: 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100',
    accent: 'text-blue-600'
  },
  green: {
    wrapper: 'border-green-200 bg-gradient-to-br from-green-50 to-green-100',
    accent: 'text-green-600'
  },
  purple: {
    wrapper: 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100',
    accent: 'text-purple-600'
  },
  indigo: {
    wrapper: 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100',
    accent: 'text-indigo-600'
  },
  orange: {
    wrapper: 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100',
    accent: 'text-orange-600'
  },
  gray: {
    wrapper: 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100',
    accent: 'text-slate-600'
  }
} as const;

export interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: keyof typeof toneStyles;
  /**
   * @deprecated use `tone`
   */
  color?: keyof typeof toneStyles;
  compact?: boolean;
}

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  compact,
  tone = 'blue',
  color
}: StatCardProps) {
  const toneName = color ?? tone;
  const styles = toneStyles[toneName];

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md',
        styles.wrapper,
        compact && 'p-4'
      )}
    >
      {Icon && <Icon className={cn('mb-3 h-6 w-6', styles.accent)} />}
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </div>
      <div className={cn('mt-1 font-semibold', compact ? 'text-2xl' : 'text-3xl', styles.accent)}>
        {value}
      </div>
      {helper && (
        <p className="mt-2 text-xs text-slate-500">
          {helper}
        </p>
      )}
    </div>
  );
}
