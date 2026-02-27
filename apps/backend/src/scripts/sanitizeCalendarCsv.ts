import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { parseCalendarCsv } from '../services/calendarCsv';

type CsvRow = Record<string, string>;
type CandidateRow = {
  rowNumber: number;
  row: CsvRow;
  dedupeKey: string;
  scoreRelevancia: number;
};
type QuarantineRow = { rowNumber: number; reason: string; dedupeKey: string; row: CsvRow };
type Args = { input: string; output: string; quarantine: string; dryRun: boolean };

const TRUE_VALUES = new Set(['true', '1', 'sim', 'yes', 'y']);
const BOOLEAN_COLUMNS = [
  'oficial',
  'data_movel',
  'flag_data_sensivel',
  'publicado_2025',
  'restricao_regulatoria',
  'aprovacao_juridica_necessaria',
] as const;
const EXPECTED_COLUMNS = 57;

function detectDelimiter(text: string) {
  const first = text.split(/\r?\n/).find((r) => r.trim()) || '';
  return (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
}

function parseArgs(argv: string[]): Args {
  const map: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [rawKey, inline] = token.split('=');
    const key = rawKey.replace(/^--/, '');
    if (inline !== undefined) map[key] = inline;
    else if (key === 'dry-run') map[key] = true;
    else {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) throw new Error(`missing_value_for_${key}`);
      map[key] = next;
      i += 1;
    }
  }
  const input = String(map.input || '').trim();
  if (!input) throw new Error('missing_required_flag_--input');
  const resolvedInput = path.resolve(input);
  const ext = path.extname(resolvedInput) || '.csv';
  const dir = path.dirname(resolvedInput);
  const base = path.basename(resolvedInput, ext);
  const nextBase = base.includes('_V12') ? base.replace('_V12', '_V12_1') : `${base}_SANITIZED`;
  return {
    input: resolvedInput,
    output: path.resolve(String(map.output || path.join(dir, `${nextBase}${ext}`))),
    quarantine: path.resolve(String(map.quarantine || path.join(dir, `${nextBase}_QUARENTENA${ext}`))),
    dryRun: Boolean(map['dry-run']),
  };
}

function t(v: unknown) {
  return String(v ?? '').trim();
}
function bool(v: string) {
  return TRUE_VALUES.has(t(v).toLowerCase());
}
function normalizeBool(v: string) {
  return bool(v) ? 'True' : 'False';
}
function parseScore(v: string) {
  const raw = t(v).replace(',', '.');
  if (!raw) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, n));
}
function formatScore(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}
function isValidDdMmYyyy(value: string) {
  const s = t(value);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return false;
  const [ddStr, mmStr, yyyyStr] = s.split('/');
  const dd = Number(ddStr);
  const mm = Number(mmStr);
  const yyyy = Number(yyyyStr);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
  return dt.getUTCFullYear() === yyyy && dt.getUTCMonth() === mm - 1 && dt.getUTCDate() === dd;
}
function slugify(v: string) {
  return t(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
function isGenericCity(v: string) {
  const n = t(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return !n || n === 'nacional' || n === 'global';
}
function isNationalTerritory(v: string) {
  const n = t(v).toUpperCase();
  return !n || n === 'BR' || n === 'BRA' || n === 'BRASIL';
}
function fairPriority(tipo: string) {
  const n = t(tipo).toLowerCase();
  if (n === 'evento_feira') return 2;
  if (n === 'data_comemorativa') return 1;
  return 0;
}
function filledCount(row: CsvRow) {
  return (t(row.fonte_oficial) ? 1 : 0) + (t(row.vertical_edro) ? 1 : 0);
}
function buildDedupeKey(row: CsvRow) {
  return `${t(row.data)}__${t(row.evento_key) || t(row.codigo_evento) || slugify(row.evento)}`;
}

function choosePreferred(a: CandidateRow, b: CandidateRow) {
  const city = (isGenericCity(a.row.cidade) ? 0 : 1) - (isGenericCity(b.row.cidade) ? 0 : 1);
  if (city !== 0) return city > 0 ? a : b;
  const territory =
    (isNationalTerritory(a.row.territorio) ? 0 : 1) - (isNationalTerritory(b.row.territorio) ? 0 : 1);
  if (territory !== 0) return territory > 0 ? a : b;
  const fair = fairPriority(a.row.tipo_evento) - fairPriority(b.row.tipo_evento);
  if (fair !== 0) return fair > 0 ? a : b;
  if (a.scoreRelevancia !== b.scoreRelevancia) return a.scoreRelevancia > b.scoreRelevancia ? a : b;
  const filled = filledCount(a.row) - filledCount(b.row);
  if (filled !== 0) return filled > 0 ? a : b;
  return a.rowNumber <= b.rowNumber ? a : b;
}

function mapRecord(headers: string[], values: string[]) {
  const row: CsvRow = {};
  headers.forEach((h, i) => {
    row[h] = t(values[i] ?? '');
  });
  return row;
}
function normalizeRow(row: CsvRow) {
  const next: CsvRow = {};
  Object.keys(row).forEach((k) => {
    next[k] = t(row[k]);
  });
  BOOLEAN_COLUMNS.forEach((k) => {
    next[k] = normalizeBool(next[k]);
  });
  return next;
}
function escapeCsv(value: string, delimiter: string) {
  if (value.includes('"') || value.includes('\n') || value.includes('\r') || value.includes(delimiter)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function buildCsv(headers: string[], rows: CsvRow[], delimiter: string) {
  const lines = [headers.map((h) => escapeCsv(h, delimiter)).join(delimiter)];
  rows.forEach((r) => {
    lines.push(headers.map((h) => escapeCsv(t(r[h]), delimiter)).join(delimiter));
  });
  return `\uFEFF${lines.join('\n')}\n`;
}
function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.input)) throw new Error(`input_not_found:${args.input}`);

  const csvText = fs.readFileSync(args.input, 'utf8');
  const delimiter = detectDelimiter(csvText);
  const records = parse(csvText, {
    columns: false,
    skip_empty_lines: true,
    trim: false,
    bom: true,
    delimiter,
    relax_column_count: true,
  }) as string[][];
  if (!records.length) throw new Error('empty_csv');

  const headers = records[0].map((v) => t(v));
  const quarantine: QuarantineRow[] = [];
  const candidates: CandidateRow[] = [];
  const stats = {
    invalidColumnCount: 0,
    invalidDateCount: 0,
    invalidBothScores: 0,
    scoreFixRelFromEd: 0,
    scoreFixEdFromRel: 0,
    duplicateRemoved: 0,
  };

  records.slice(1).forEach((values, idx) => {
    const rowNumber = idx + 2;
    if (values.length !== headers.length) {
      stats.invalidColumnCount += 1;
      quarantine.push({ rowNumber, reason: 'invalid_column_count', dedupeKey: '', row: mapRecord(headers, values) });
      return;
    }
    const row = normalizeRow(mapRecord(headers, values));
    const dedupeKey = buildDedupeKey(row);
    if (!isValidDdMmYyyy(row.data)) {
      stats.invalidDateCount += 1;
      quarantine.push({ rowNumber, reason: 'invalid_date', dedupeKey, row });
      return;
    }

    let rel = parseScore(row.score_relevancia);
    let ed = parseScore(row.score_editorial);
    if (rel === null && ed === null) {
      stats.invalidBothScores += 1;
      quarantine.push({ rowNumber, reason: 'invalid_scores_both', dedupeKey, row });
      return;
    }
    if (rel === null && ed !== null) {
      rel = ed;
      stats.scoreFixRelFromEd += 1;
    }
    if (ed === null && rel !== null) {
      ed = rel;
      stats.scoreFixEdFromRel += 1;
    }
    if (rel === null || ed === null) {
      stats.invalidBothScores += 1;
      quarantine.push({ rowNumber, reason: 'invalid_scores_both', dedupeKey, row });
      return;
    }
    row.score_relevancia = formatScore(rel);
    row.score_editorial = formatScore(ed);
    candidates.push({ rowNumber, row, dedupeKey, scoreRelevancia: rel });
  });

  const grouped = new Map<string, CandidateRow[]>();
  candidates.forEach((c) => {
    const arr = grouped.get(c.dedupeKey) || [];
    arr.push(c);
    grouped.set(c.dedupeKey, arr);
  });

  const selected: CandidateRow[] = [];
  grouped.forEach((arr) => {
    if (arr.length === 1) {
      selected.push(arr[0]);
      return;
    }
    const winner = arr.reduce((best, cur) => choosePreferred(best, cur));
    selected.push(winner);
    arr.forEach((item) => {
      if (item.rowNumber === winner.rowNumber) return;
      stats.duplicateRemoved += 1;
      quarantine.push({
        rowNumber: item.rowNumber,
        reason: `duplicate_less_specific|kept_row=${winner.rowNumber}`,
        dedupeKey: item.dedupeKey,
        row: item.row,
      });
    });
  });

  const sanitizedRows = selected.sort((a, b) => a.rowNumber - b.rowNumber).map((x) => x.row);
  const invalidScoreAfter = sanitizedRows.filter(
    (r) => parseScore(r.score_relevancia) === null || parseScore(r.score_editorial) === null
  ).length;
  const invalidDateAfter = sanitizedRows.filter((r) => !isValidDdMmYyyy(r.data)).length;
  const sanitizedCsv = buildCsv(headers, sanitizedRows, delimiter);
  const parserResult = parseCalendarCsv(sanitizedCsv, { sourceLabel: 'calendar_sanitized_v12_1' });

  if (!args.dryRun) {
    ensureDir(args.output);
    ensureDir(args.quarantine);
    fs.writeFileSync(args.output, sanitizedCsv, 'utf8');
    const quarantineHeaders = [...headers, '_quarantine_reason', '_source_row', '_dedupe_key'];
    const quarantineRows = quarantine
      .sort((a, b) => a.rowNumber - b.rowNumber)
      .map((q) => ({
        ...q.row,
        _quarantine_reason: q.reason,
        _source_row: String(q.rowNumber),
        _dedupe_key: q.dedupeKey,
      }));
    fs.writeFileSync(args.quarantine, buildCsv(quarantineHeaders, quarantineRows, delimiter), 'utf8');
  }

  console.log(`[calendar-sanitize] input: ${args.input}`);
  console.log(`[calendar-sanitize] delimiter: ${delimiter}`);
  console.log(`[calendar-sanitize] header columns: ${headers.length}`);
  if (headers.length !== EXPECTED_COLUMNS) {
    console.log(`[calendar-sanitize] warning: expected ${EXPECTED_COLUMNS} columns but found ${headers.length}`);
  }
  console.log(`[calendar-sanitize] rows total: ${records.length - 1}`);
  console.log(`[calendar-sanitize] rows sanitized: ${sanitizedRows.length}`);
  console.log(`[calendar-sanitize] rows quarantined: ${quarantine.length}`);
  console.log(`[calendar-sanitize] corrected score_relevancia from score_editorial: ${stats.scoreFixRelFromEd}`);
  console.log(`[calendar-sanitize] corrected score_editorial from score_relevancia: ${stats.scoreFixEdFromRel}`);
  console.log(`[calendar-sanitize] quarantined invalid column count: ${stats.invalidColumnCount}`);
  console.log(`[calendar-sanitize] quarantined invalid dates: ${stats.invalidDateCount}`);
  console.log(`[calendar-sanitize] quarantined invalid scores (both): ${stats.invalidBothScores}`);
  console.log(`[calendar-sanitize] duplicates removed: ${stats.duplicateRemoved}`);
  console.log(`[calendar-sanitize] invalid score after sanitize: ${invalidScoreAfter}`);
  console.log(`[calendar-sanitize] invalid date after sanitize: ${invalidDateAfter}`);
  console.log(
    `[calendar-sanitize] parser compatibility: events=${parserResult.events.length}, errors=${parserResult.errors.length}`
  );
  if (parserResult.errors.length) {
    console.log('[calendar-sanitize] parser errors sample:', parserResult.errors.slice(0, 5));
  }
  if (args.dryRun) console.log('[calendar-sanitize] dry-run enabled (no files written).');
  else {
    console.log(`[calendar-sanitize] output: ${args.output}`);
    console.log(`[calendar-sanitize] quarantine: ${args.quarantine}`);
  }
}

main().catch((error) => {
  console.error('[calendar-sanitize] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
