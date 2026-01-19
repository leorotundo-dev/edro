import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface DataTableProps {
  headers: Array<string | { key: string; label: string; align?: 'left' | 'center' | 'right' }>;
  children: ReactNode;
  dense?: boolean;
  className?: string;
}

export function DataTable({ headers, children, dense, className }: DataTableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <table className={cn('w-full text-sm', dense && 'text-xs')}>
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map((header) => {
              const config = typeof header === 'string' ? { key: header, label: header } : header;
              return (
                <th
                  key={config.key}
                  className={cn('px-4 py-3', config.align === 'right' && 'text-right', config.align === 'center' && 'text-center')}
                >
                  {config.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {children}
        </tbody>
      </table>
    </div>
  );
}
