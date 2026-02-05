import fs from 'fs';
import path from 'path';
import { parseCalendarCsv } from '../services/calendarCsv';
import { upsertEvents } from '../repos/eventsRepo';

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const defaultPath = path.join(repoRoot, 'docs', 'EDRO_CALENDARIO_2026_PREENCHIDO_COMPLETO.csv');

const csvPath = process.env.CALENDAR_CSV_PATH || defaultPath;
const sourceLabel = process.env.CALENDAR_SOURCE_LABEL || 'calendar_master_2026';
const tenantId = process.env.TENANT_ID || null;
const reviewer = process.env.REVIEWER_EMAIL || 'system';

async function loadCsvText(pathOrUrl: string) {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    const response = await fetch(pathOrUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }
    return response.text();
  }
  if (!fs.existsSync(pathOrUrl)) {
    throw new Error(`CSV not found: ${pathOrUrl}`);
  }
  return fs.readFileSync(pathOrUrl, 'utf8');
}

async function main() {
  const csvText = await loadCsvText(csvPath);
  const { events, errors } = parseCalendarCsv(csvText, { sourceLabel });

  console.log(`Parsed events: ${events.length}`);
  if (errors.length) {
    console.log(`Errors: ${errors.length}`);
    console.log(errors.slice(0, 10));
  }

  await upsertEvents(events, sourceLabel, {
    tenantId,
    status: 'approved',
    reviewedBy: reviewer,
    sourceUrl: csvPath,
  });

  console.log('Import done.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
