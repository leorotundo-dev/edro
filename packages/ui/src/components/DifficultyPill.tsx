import { cn } from '../utils/cn';

const LEVELS = [
  { label: 'Muito facil', className: 'border-emerald-200 bg-emerald-100 text-emerald-700' },
  { label: 'Facil', className: 'border-green-200 bg-green-100 text-green-700' },
  { label: 'Medio', className: 'border-amber-200 bg-amber-100 text-amber-700' },
  { label: 'Dificil', className: 'border-orange-200 bg-orange-100 text-orange-700' },
  { label: 'Turbo', className: 'border-rose-200 bg-rose-100 text-rose-700' },
];

export interface DifficultyPillProps {
  level: number;
  showLabel?: boolean;
  className?: string;
}

export function DifficultyPill({ level, showLabel = true, className }: DifficultyPillProps) {
  const normalized = Math.min(Math.max(Math.round(level), 1), 5);
  const meta = LEVELS[normalized - 1];
  const dots = Array.from({ length: 5 }, (_, index) => index < normalized);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
        meta.className,
        className
      )}
    >
      {showLabel && <span>{meta.label}</span>}
      <span className="flex items-center gap-1">
        {dots.map((active, index) => (
          <span
            key={index}
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              active ? 'bg-current' : 'bg-current/30'
            )}
          />
        ))}
      </span>
    </span>
  );
}
