const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/Sao_Paulo';

export const formatDateKey = (value: Date, timeZone: string = APP_TIMEZONE): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(value);
  } catch {
    return value.toISOString().split('T')[0];
  }
};

export const parseDateKey = (value: string): Date => {
  const trimmed = (value || '').trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const fallback = new Date();
    return new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate()));
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
};

export const resolveDateKey = (value?: Date | string, timeZone: string = APP_TIMEZONE) => {
  if (typeof value === 'string' && value.trim()) {
    const key = value.trim();
    return { key, date: parseDateKey(key) };
  }

  const date = value instanceof Date ? value : new Date();
  const key = formatDateKey(date, timeZone);
  return { key, date: parseDateKey(key) };
};

export const addDaysUtc = (value: Date, days: number) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days));

export const diffDaysUtc = (start: Date, end: Date) => {
  const startUtc = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  return Math.ceil((endUtc.getTime() - startUtc.getTime()) / (1000 * 60 * 60 * 24));
};

