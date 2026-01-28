import fs from 'fs';
import path from 'path';
import { env } from '../env';
import { parseCalendarCsv } from './calendarCsv';
import { upsertEvents } from '../repos/eventsRepo';

type BootstrapResult = {
  sourcePath?: string;
  loaded: number;
  errors: number;
  skipped: boolean;
};

function resolveCsvPath() {
  if (env.CALENDAR_CSV_PATH && fs.existsSync(env.CALENDAR_CSV_PATH)) {
    return env.CALENDAR_CSV_PATH;
  }

  const year = env.CALENDAR_YEAR || new Date().getFullYear();
  const filename = `edro_calendar_master_${year}_BR.csv`;

  const candidates = [
    path.resolve(process.cwd(), 'docs', filename),
    path.resolve(process.cwd(), filename),
    path.resolve(process.cwd(), '..', 'docs', filename),
    path.resolve(process.cwd(), '..', '..', 'docs', filename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function bootstrapCalendarEvents(): Promise<BootstrapResult> {
  const csvPath = resolveCsvPath();
  if (!csvPath) {
    console.warn('[calendar] CSV master not found. Skipping bootstrap.');
    return { loaded: 0, errors: 0, skipped: true };
  }

  const csvText = fs.readFileSync(csvPath, 'utf8');
  const { events, errors } = parseCalendarCsv(csvText, {
    sourceLabel: 'calendar_csv',
    sourceUrl: csvPath,
  });

  if (errors.length) {
    console.warn('[calendar] CSV parse issues:', errors.slice(0, 5));
  }

  if (events.length) {
    await upsertEvents(events, 'calendar_csv', {
      status: 'approved',
      sourceUrl: csvPath,
    });
  }

  return {
    sourcePath: csvPath,
    loaded: events.length,
    errors: errors.length,
    skipped: false,
  };
}
