import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

type Row = Record<string, string | number>;

const YEAR = Number(process.env.CALENDAR_YEAR || '2026');

const PLAT = {
  SOCIAL: 'Instagram|Facebook',
  PERF: 'MetaAds|GoogleAds',
  ALL: 'Instagram|Facebook|LinkedIn|MetaAds|GoogleAds|EmailMarketing',
  BRAND: 'Instagram|LinkedIn',
  VIDEO: 'TikTok|Instagram',
};

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dateUTC(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(d: Date, n: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function easterDate(year: number) {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dateUTC(year, month, day);
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number) {
  // weekday: 0=Sun..6=Sat (JS)
  const first = dateUTC(year, month, 1);
  const firstW = first.getUTCDay();
  const delta = (weekday - firstW + 7) % 7;
  const day = 1 + delta + 7 * (n - 1);
  return dateUTC(year, month, day);
}

function fourthFriday(year: number, month: number) {
  return nthWeekdayOfMonth(year, month, 5, 4);
}

const rows: Row[] = [];
const seen = new Set<string>();

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const docsDir = path.resolve(repoRoot, 'docs');

const dailyCsvPath = path.resolve(repoRoot, 'calendario_365_dias_completo_2026.csv');
const wikiTxtPath = path.resolve(repoRoot, 'wikipedia-datas-comemorativas.txt');

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function splitPipe(value: string) {
  return normalizeText(value)
    .split('|')
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function splitComma(value: string) {
  return normalizeText(value)
    .split(',')
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function eventTypeFromTags(tags: string[]) {
  const joined = tags.map((t) => t.toLowerCase()).join('|');
  if (joined.includes('feriado') || joined.includes('oficial')) return 'official';
  if (joined.includes('varejo') || joined.includes('comercial') || joined.includes('promo')) return 'retail';
  if (joined.includes('internacional')) return 'international';
  if (joined.includes('regional')) return 'regional';
  if (joined.includes('cultural') || joined.includes('religioso')) return 'cultural';
  return 'behavior';
}

function priorityFromTags(tags: string[]) {
  const joined = tags.map((t) => t.toLowerCase()).join('|');
  if (joined.includes('feriado') || joined.includes('oficial')) return 90;
  if (joined.includes('varejo') || joined.includes('promo')) return 75;
  if (joined.includes('cultural')) return 55;
  if (joined.includes('religioso')) return 60;
  return 45;
}

function pushRow(r: Partial<Row>) {
  const base: Row = {
    date_iso: '',
    event_name: '',
    event_type: '',
    segment_tags: '',
    country: 'BR',
    state: '',
    city: '',
    recurrence: 'annual',
    priority_0_100: 50,
    risk_weight_0_100: 50,
    window_key: '',
    window_phase: '',
    locality_scope: 'national',
    content_angles: '',
    default_cta: '',
    platform_fit: '',
    notes: '',
    source_hint: '',
  };
  const row = { ...base, ...r } as Row;
  const dateIso = String(row.date_iso || '').trim();
  const name = String(row.event_name || '').trim();
  if (!dateIso || !name) return;
  const key = `${dateIso}::${name.toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  rows.push(row);
}

function ingestDailyCsv() {
  if (!fs.existsSync(dailyCsvPath)) return;
  const raw = fs.readFileSync(dailyCsvPath, 'utf8');
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  }) as Array<Record<string, string>>;

  records.forEach((record) => {
    const dateIso = normalizeText(record.data || '');
    if (!dateIso) return;

    const commemorations = splitPipe(record.comemoracoes || '');
    if (!commemorations.length) return;

    const categories = splitPipe(record.categorias || '');
    const oticas = splitPipe(record.oticas || '');
    const tags = Array.from(new Set([...categories, ...oticas].filter(Boolean)));
    const eventType = eventTypeFromTags(tags);
    const priority = priorityFromTags(tags);

    commemorations.forEach((item) => {
      pushRow({
        date_iso: dateIso,
        event_name: item,
        event_type: eventType,
        segment_tags: tags.join('|'),
        priority_0_100: priority,
        risk_weight_0_100: clamp(priority + 5, 30, 95),
        window_key: item.toUpperCase().replace(/\W+/g, '_'),
        window_phase: 'peak',
        content_angles: 'conteudo util|informacao|contexto do dia',
        default_cta: 'Saiba mais',
        platform_fit: PLAT.BRAND,
        notes: 'Calendario 365 dias (CSV)',
        source_hint: 'CSV 365 dias',
      });
    });
  });
}

function ingestWikiTxt() {
  if (!fs.existsSync(wikiTxtPath)) return;
  const raw = fs.readFileSync(wikiTxtPath, 'utf8');
  const monthMap: Record<string, number> = {
    janeiro: 1,
    fevereiro: 2,
    marco: 3,
    março: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12,
  };

  let currentMonth = 0;
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = normalizeText(line);
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    if (monthMap[lower]) {
      currentMonth = monthMap[lower];
      return;
    }

    if (!currentMonth) return;
    const match = trimmed.match(/^(\d{1,2})\s*[-–]\s*(.+)$/);
    if (!match) return;

    const day = Number(match[1]);
    const events = splitComma(match[2]);
    const dateIso = iso(dateUTC(YEAR, currentMonth, day));
    const tags = ['datas_comemorativas', 'cultural'];

    events.forEach((eventName) => {
      pushRow({
        date_iso: dateIso,
        event_name: eventName,
        event_type: 'cultural',
        segment_tags: tags.join('|'),
        priority_0_100: 50,
        risk_weight_0_100: 55,
        window_key: eventName.toUpperCase().replace(/\W+/g, '_'),
        window_phase: 'peak',
        content_angles: 'curadoria|contexto cultural|datas relevantes',
        default_cta: 'Saiba mais',
        platform_fit: PLAT.BRAND,
        notes: 'Lista complementar (wiki)',
        source_hint: 'Wikipedia datas comemorativas',
      });
    });
  });
}

function windowAround(date: Date, key: string, preDays = 14, postDays = 3, priorityPeak = 100) {
  for (let i = preDays; i >= 1; i -= 1) {
    pushRow({
      date_iso: iso(addDays(date, -i)),
      event_name: `${key} (janela pre | D-${i})`,
      event_type: 'retail',
      segment_tags: 'varejo|promo|planejamento',
      priority_0_100: clamp(priorityPeak - 20, 40, 95),
      risk_weight_0_100: clamp(60 + (preDays - i) * 2, 60, 95),
      window_key: key,
      window_phase: 'pre',
      content_angles: 'aquecimento|lista de desejos|teaser|beneficios',
      default_cta: 'Ativar alerta',
      platform_fit: PLAT.ALL,
      notes: 'Janela automatica pre-evento',
      source_hint: 'Gerador Edro (janela)',
    });
  }

  pushRow({
    date_iso: iso(date),
    event_name: key,
    event_type: 'retail',
    segment_tags: 'varejo|promo|ecommerce',
    priority_0_100: priorityPeak,
    risk_weight_0_100: 100,
    window_key: key,
    window_phase: 'peak',
    content_angles: 'oferta forte|prova social|escassez|comparativo',
    default_cta: 'Comprar agora',
    platform_fit: PLAT.PERF,
    notes: 'Dia pico',
    source_hint: 'Gerador Edro (peak)',
  });

  for (let i = 1; i <= postDays; i += 1) {
    pushRow({
      date_iso: iso(addDays(date, i)),
      event_name: `${key} (janela pos | D+${i})`,
      event_type: 'retail',
      segment_tags: 'varejo|retencao|crm',
      priority_0_100: clamp(priorityPeak - 35, 30, 85),
      risk_weight_0_100: clamp(55 - i * 5, 25, 55),
      window_key: key,
      window_phase: 'post',
      content_angles: 'ultima chance|retargeting|up-sell|agradecimento',
      default_cta: 'Ver condicoes',
      platform_fit: PLAT.ALL,
      notes: 'Janela automatica pos-evento',
      source_hint: 'Gerador Edro (janela)',
    });
  }
}

// 1) Feriados nacionais fixos
[
  ['Confraternizacao Universal', 1, 1, 100, 'official', 'all|institucional|varejo'],
  ['Tiradentes', 4, 21, 85, 'official', 'all|institucional|varejo'],
  ['Dia do Trabalho', 5, 1, 90, 'official', 'all|institucional|varejo'],
  ['Independencia do Brasil', 9, 7, 90, 'official', 'all|institucional|varejo'],
  ['Nossa Senhora Aparecida / Dia das Criancas', 10, 12, 95, 'official', 'varejo|familia|presentes'],
  ['Finados', 11, 2, 70, 'official', 'institucional'],
  ['Proclamacao da Republica', 11, 15, 80, 'official', 'institucional|varejo'],
  ['Dia da Consciencia Negra', 11, 20, 80, 'official', 'cultural|institucional|varejo'],
  ['Natal', 12, 25, 100, 'official', 'varejo|familia|presentes'],
].forEach(([name, m, d, pr, type, tags]) => {
  pushRow({
    date_iso: iso(dateUTC(YEAR, Number(m), Number(d))),
    event_name: String(name),
    event_type: String(type),
    segment_tags: String(tags),
    priority_0_100: Number(pr),
    risk_weight_0_100: Number(Number(pr) >= 90 ? 85 : 60),
    window_key: String(name).toUpperCase().replace(/\W+/g, '_'),
    window_phase: 'peak',
    content_angles: 'mensagem institucional|servico|horarios|comunidade',
    default_cta: 'Saiba mais',
    platform_fit: PLAT.BRAND,
    notes: 'Feriado nacional',
    source_hint: 'Feriados nacionais (Brasil)',
  });
});

// 2) Datas moveis por Pascoa
const easter = easterDate(YEAR);
const carnavalTue = addDays(easter, -47);
const carnavalMon = addDays(easter, -48);
const ashWed = addDays(easter, -46);
const goodFriday = addDays(easter, -2);
const corpus = addDays(easter, 60);

[
  ['Carnaval (segunda-feira)', carnavalMon, 85, 'cultural', 'varejo|entretenimento|turismo'],
  ['Carnaval (terca-feira)', carnavalTue, 95, 'cultural', 'varejo|entretenimento|turismo'],
  ['Quarta-feira de Cinzas', ashWed, 55, 'cultural', 'institucional|servicos'],
  ['Sexta-feira Santa', goodFriday, 90, 'official', 'varejo|familia'],
  ['Pascoa', easter, 100, 'cultural', 'varejo|familia|chocolate'],
  ['Corpus Christi', corpus, 80, 'official', 'varejo|turismo|institucional'],
].forEach(([name, dt, pr, type, tags]) => {
  pushRow({
    date_iso: iso(dt as Date),
    event_name: String(name),
    event_type: String(type),
    segment_tags: String(tags),
    priority_0_100: Number(pr),
    risk_weight_0_100: Number(Number(pr) >= 90 ? 80 : 55),
    window_key: String(name).toUpperCase().replace(/\W+/g, '_'),
    window_phase: 'peak',
    content_angles: 'servicos|horarios|promo tematica|conteudo cultural',
    default_cta: 'Confira',
    platform_fit: PLAT.ALL,
    notes: 'Data movel (calculo por Pascoa)',
    source_hint: 'Gerador Edro (Pascoa)',
  });
});

// 3) Varejo big bets com janelas automaticas
const mothers = nthWeekdayOfMonth(YEAR, 5, 0, 2);
const fathers = nthWeekdayOfMonth(YEAR, 8, 0, 2);
const consumer = dateUTC(YEAR, 3, 15);
const bf = fourthFriday(YEAR, 11);
const cyber = addDays(bf, 3);

[
  ['CONSUMER_DAY_2026', consumer, 95],
  ['MOTHERS_DAY_2026', mothers, 100],
  ['VALENTINES_BR_2026', dateUTC(YEAR, 6, 12), 95],
  ['FATHERS_DAY_2026', fathers, 95],
  ['KIDS_DAY_2026', dateUTC(YEAR, 10, 12), 95],
  ['BLACK_FRIDAY_2026', bf, 100],
  ['CYBER_MONDAY_2026', cyber, 85],
  ['CHRISTMAS_2026', dateUTC(YEAR, 12, 25), 100],
].forEach(([key, dt, pr]) => windowAround(dt as Date, String(key), 14, 3, Number(pr)));

// 4) Janelas sazonais
[
  ['SUMMER_SALE_2026', dateUTC(YEAR, 1, 2), 'retail', 'varejo|promo|sazonal', 70],
  ['BACK_TO_SCHOOL_2026', dateUTC(YEAR, 2, 1), 'retail', 'varejo|papelaria|educacao', 80],
  ['JUNE_FESTS_2026', dateUTC(YEAR, 6, 1), 'cultural', 'varejo|alimentos|regional', 55],
  ['JULY_VACATION_2026', dateUTC(YEAR, 7, 1), 'seasonal', 'varejo|turismo|entretenimento', 60],
  ['BLACK_NOVEMBER_2026', dateUTC(YEAR, 11, 1), 'retail', 'varejo|promo|ecommerce', 75],
  ['OCTOBER_ROSA_2026', dateUTC(YEAR, 10, 1), 'cultural', 'saude|institucional', 60],
  ['NOVEMBER_AZUL_2026', dateUTC(YEAR, 11, 1), 'cultural', 'saude|institucional', 55],
].forEach(([key, dt, type, tags, pr]) => {
  pushRow({
    date_iso: iso(dt as Date),
    event_name: `${key} (janela)`,
    event_type: String(type),
    segment_tags: String(tags),
    priority_0_100: Number(pr),
    risk_weight_0_100: Number(pr),
    window_key: String(key),
    window_phase: 'pre',
    content_angles: 'conscientizacao|servico|conteudo educativo|acao social',
    default_cta: 'Saiba mais',
    platform_fit: PLAT.BRAND,
    notes: 'Janela mensal/sazonal',
    source_hint: 'Gerador Edro (sazonal)',
  });
});

// 5) Payday hook mensal (heuristico)
for (let m = 1; m <= 12; m += 1) {
  pushRow({
    date_iso: iso(dateUTC(YEAR, m, 5)),
    event_name: 'Janela de salario (aprox.)',
    event_type: 'behavior',
    segment_tags: 'varejo|promo|planejamento',
    recurrence: 'monthly',
    priority_0_100: 30,
    risk_weight_0_100: 25,
    window_key: `PAYDAY_${YEAR}_${String(m).padStart(2, '0')}`,
    window_phase: 'peak',
    content_angles: 'planejamento|lista de compras|economia',
    default_cta: 'Ver ofertas',
    platform_fit: PLAT.PERF,
    notes: 'Heuristica (varia por empresa)',
    source_hint: 'Gerador Edro (heuristica)',
  });
}

// 6) Datas internacionais uteis (lista expandivel)
const intl = [
  [1, 24, 'Dia Internacional da Educacao', 'educacao|institucional', 40],
  [2, 4, 'Dia Mundial do Cancer', 'saude|institucional', 45],
  [3, 22, 'Dia Mundial da Agua', 'sustentabilidade|institucional', 55],
  [4, 7, 'Dia Mundial da Saude', 'saude|institucional', 50],
  [4, 22, 'Dia da Terra (Earth Day)', 'sustentabilidade|institucional', 55],
  [6, 5, 'Dia Mundial do Meio Ambiente', 'sustentabilidade|institucional', 65],
  [9, 27, 'Dia Mundial do Turismo', 'turismo|varejo', 40],
  [10, 16, 'Dia Mundial da Alimentacao', 'alimentos|varejo|institucional', 45],
  [12, 1, 'Dia Mundial de Luta contra a AIDS', 'saude|institucional', 35],
  [12, 10, 'Dia dos Direitos Humanos', 'institucional', 30],
];

intl.forEach(([m, d, name, tags, pr]) => {
  pushRow({
    date_iso: iso(dateUTC(YEAR, Number(m), Number(d))),
    event_name: String(name),
    event_type: 'international',
    segment_tags: String(tags),
    priority_0_100: Number(pr),
    risk_weight_0_100: clamp(Number(pr), 20, 65),
    window_key: String(name).toUpperCase().replace(/\W+/g, '_'),
    window_phase: 'peak',
    content_angles: 'conteudo educativo|institucional|acao pratica',
    default_cta: 'Saiba mais',
    platform_fit: PLAT.BRAND,
    notes: 'Gancho de conteudo (nao comercial agressivo)',
    source_hint: 'Curadoria datas internacionais',
  });
});

// 7) Regionais por UF (capitais)
const capitals = [
  ['SP', 'Sao Paulo', 'Aniversario de Sao Paulo', 1, 25],
  ['RJ', 'Rio de Janeiro', 'Aniversario do Rio de Janeiro', 3, 1],
  ['PR', 'Curitiba', 'Aniversario de Curitiba', 3, 29],
  ['BA', 'Salvador', 'Aniversario de Salvador', 3, 29],
];

capitals.forEach(([uf, city, name, m, d]) => {
  pushRow({
    date_iso: iso(dateUTC(YEAR, Number(m), Number(d))),
    event_name: String(name),
    event_type: 'regional',
    segment_tags: 'regional|varejo|comunidade',
    state: String(uf),
    city: String(city),
    locality_scope: 'city',
    priority_0_100: 45,
    risk_weight_0_100: 55,
    window_key: `ANNIV_${String(city).toUpperCase().replace(/\W+/g, '_')}_${YEAR}`,
    window_phase: 'peak',
    content_angles: 'orgulho local|historia|beneficios na regiao',
    default_cta: 'Confira',
    platform_fit: PLAT.SOCIAL,
    notes: 'Data municipal (expansivel por base plugavel)',
    source_hint: 'Curadoria regional (exemplo)',
  });
});

// 8) Importa calendario 365 dias e lista complementar (se existirem).
ingestDailyCsv();
ingestWikiTxt();

// 9) Preenche dias sem eventos com pauta editorial.
const existingDates = new Set(rows.map((row) => String(row.date_iso)));
const start = dateUTC(YEAR, 1, 1);
for (let i = 0; i < 366; i += 1) {
  const current = addDays(start, i);
  if (current.getUTCFullYear() !== YEAR) break;
  const dateIso = iso(current);
  if (existingDates.has(dateIso)) continue;
  pushRow({
    date_iso: dateIso,
    event_name: 'Pauta editorial do dia',
    event_type: 'behavior',
    segment_tags: 'editorial|pauta_livre',
    priority_0_100: 20,
    risk_weight_0_100: 20,
    window_key: `PAUTA_${dateIso.replace(/-/g, '')}`,
    window_phase: 'peak',
    content_angles: 'informativo|educativo|institucional',
    default_cta: 'Saiba mais',
    platform_fit: PLAT.BRAND,
    notes: 'Fallback para dias sem comemoracao',
    source_hint: 'Fallback Edro',
  });
}

rows.sort((a, b) => {
  const da = String(a.date_iso).localeCompare(String(b.date_iso));
  if (da !== 0) return da;
  return Number(b.priority_0_100) - Number(a.priority_0_100);
});

const header = Object.keys(rows[0]).join(',');
const escape = (value: any) => {
  const s = String(value ?? '');
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};
const lines = [header, ...rows.map((row) => Object.keys(row).map((k) => escape((row as any)[k])).join(','))];

if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

const outPath = path.join(docsDir, `edro_calendar_master_${YEAR}_BR.csv`);
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`OK: gerado ${outPath} com ${rows.length} linhas`);
