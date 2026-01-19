import { cn } from '../utils/cn';

const TONES = {
  focus: 'from-blue-500 to-indigo-500',
  energy: 'from-orange-500 to-amber-500',
  mood: 'from-emerald-500 to-lime-500',
  neutral: 'from-slate-400 to-slate-500',
} as const;

export interface CognitiveMeterProps {
  label: string;
  value?: number | null;
  max?: number;
  helper?: string;
  tone?: keyof typeof TONES;
  showValue?: boolean;
  className?: string;
}

export function CognitiveMeter({
  label,
  value,
  max = 100,
  helper,
  tone = 'neutral',
  showValue = true,
  className,
}: CognitiveMeterProps) {
  const safeValue = typeof value === 'number' ? Math.max(0, Math.min(value, max)) : 0;
  const percentage = max > 0 ? Math.round((safeValue / max) * 100) : 0;

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-3', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {showValue && (
          <span className="text-xs font-semibold text-slate-600">
            {Math.round(safeValue)}/{max}
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn(
            'h-2 rounded-full bg-gradient-to-r transition-all duration-300',
            TONES[tone]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {helper && <div className="mt-2 text-xs text-slate-500">{helper}</div>}
    </div>
  );
}
