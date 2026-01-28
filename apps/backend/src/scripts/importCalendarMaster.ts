import fs from 'fs';
import path from 'path';
import { parseCalendarCsv } from '../services/calendarCsv';
import { upsertEvents } from '../repos/eventsRepo';

const YEAR = Number(process.env.CALENDAR_YEAR || '2026');

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const docsDir = path.resolve(repoRoot, 'docs');
const defaultPath = path.join(docsDir, `edro_calendar_master_${YEAR}_BR.csv`);

const csvPath = process.env.CALENDAR_CSV_PATH || process.argv[2] || defaultPath;
const sourceLabel = process.env.CALENDAR_SOURCE_LABEL || `calendar_master_${YEAR}`;
const reviewedBy = process.env.CALENDAR_REVIEWED_BY || 'system:calendar-import';
const tenantId = process.env.CALENDAR_TENANT_ID || null;

function exitWithError(message: string) {
  console.error(`[calendar-import] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  exitWithError(`CSV nao encontrado: ${csvPath}`);
}

const csvText = fs.readFileSync(csvPath, 'utf8');
const { events, errors } = parseCalendarCsv(csvText, {
  sourceLabel,
  sourceUrl: `file://${csvPath}`,
  defaults: { country: 'BR', scope: 'BR' },
});

if (!events.length) {
  exitWithError('Nenhum evento valido encontrado no CSV.');
}

if (errors.length) {
  console.warn(`[calendar-import] ${errors.length} linhas com erro foram ignoradas.`);
}

upsertEvents(events, sourceLabel, {
  tenantId: tenantId || undefined,
  status: 'approved',
  reviewedBy,
  sourceUrl: `file://${csvPath}`,
})
  .then(() => {
    console.log(
      `[calendar-import] OK: ${events.length} eventos importados de ${path.basename(csvPath)}`
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    exitWithError(err?.message || 'Falha ao importar eventos.');
  });
