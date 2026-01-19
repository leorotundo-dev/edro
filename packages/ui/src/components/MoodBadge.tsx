import { cn } from '../utils/cn';

type MoodVariant = {
  label: string;
  className: string;
  min: number;
  max: number;
};

const MOODS: MoodVariant[] = [
  { label: 'Baixo', className: 'border-rose-200 bg-rose-100 text-rose-700', min: 0, max: 2 },
  { label: 'Neutro', className: 'border-slate-200 bg-slate-100 text-slate-700', min: 2.01, max: 3.49 },
  { label: 'Bom', className: 'border-emerald-200 bg-emerald-100 text-emerald-700', min: 3.5, max: 4.4 },
  { label: 'Otimo', className: 'border-lime-200 bg-lime-100 text-lime-700', min: 4.41, max: 5 },
];

export interface MoodBadgeProps {
  value?: number | null;
  className?: string;
}

export function MoodBadge({ value, className }: MoodBadgeProps) {
  const safeValue = typeof value === 'number' ? value : null;
  const mood = safeValue
    ? MOODS.find((variant) => safeValue >= variant.min && safeValue <= variant.max)
    : null;

  const label = mood?.label || 'Sem dados';
  const styles = mood?.className || 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold',
        styles,
        className
      )}
    >
      {label}
      {safeValue ? <span className="opacity-70">{safeValue.toFixed(1)}</span> : null}
    </span>
  );
}
