/**
 * Harvest Service
 *
 * Coleta de conteudo de fontes externas
 */

import { query } from '../db';
import { fetchHtml } from '../adapters/harvest/fetchHtml';
import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type {
  EditalStatus,
  EditalDisciplina,
  EditalCargo,
  EditalArquivo,
  EditalProcessingSteps,
  EventoTipo,
} from '../types/edital';
import { extractBlueprintStructure, extractCargoStructure, extractExamMatrixStructure } from './ai/openaiService';
import { FileStorageService } from './fileStorage';
import { classifyPdfText } from './pdfValidator';
import {
  getPdfCacheByUrl,
  isPdfCacheFresh,
  linkPdfCacheToEdital,
  upsertPdfCache,
  type EditalPdfCacheEntry
} from './editalPdfCacheService';
import { recordCacheHit } from './apmService';

// ============================================
// TIPOS
// ============================================

export interface HarvestSourceConfig {
  seed_urls?: string[];
  seedUrls?: string[];
  seeds?: string[];
  paths?: string[];
  sitemap_urls?: string[];
  sitemapUrls?: string[];
  linkPatterns?: string[];
  bannedPatterns?: string[];
  allowedDomains?: string[];
  banca?: string;
  textIncludePatterns?: string[];
  textExcludePatterns?: string[];
  urlIncludePatterns?: string[];
  urlExcludePatterns?: string[];
}

export interface HarvestSource {
  id: string;
  name: string;
  base_url: string;
  type: 'questoes' | 'teoria' | 'video' | 'pdf' | 'edital';
  enabled: boolean;
  priority: number;
  config?: HarvestSourceConfig | null;
  last_run?: string | null;
  items_harvested?: number;
  status?: 'idle' | 'running' | 'success' | 'error' | 'paused';
  banca?: string;
}

export interface HarvestContent {
  id: string;
  source_id: string;
  url: string;
  title: string;
  content_type: string;
  raw_html?: string;
  parsed_content?: any;
  metadata?: any;
  status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: Date;
  harvested_at?: Date;
  source_name?: string;
  edital_id?: string | null;
  processing_steps?: EditalProcessingSteps | null;
}

export interface HarvestResult {
  success: boolean;
  harvested_count: number;
  errors: string[];
  contents: HarvestContent[];
}

export interface ParsedHarvestedPdf {
  text: string;
  words?: number;
  pages?: number;
  buffer?: Buffer;
  method?: 'pdftotext' | 'pdf-parse' | 'ocr' | 'none';
  ocr_status?: 'ok' | 'falhou' | 'nao_necessario';
  ocr_used?: boolean;
  signal_low?: boolean;
  content_hash?: string;
  classification?: string;
  cached?: boolean;
}

type ParsedDates = {
  publication?: string;
  inscricaoInicio?: string;
  inscricaoFim?: string;
  provaPrevista?: string;
};

type PdfLink = {
  url: string;
  label?: string;
  kind?: string;
  score?: number;
};

const DATE_REGEX = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
const TEXT_DATE_REGEX = /(\d{1,2})\s*(?:o|º|°)?\s*(?:de)?\s*(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de)?\s*(\d{4})/gi;
const MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
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
const AI_TEXT_LIMIT = 18000;
const PDF_FETCH_TIMEOUT_MS = toNumberEnv(process.env.PDF_FETCH_TIMEOUT_MS, 30000);
const PDF_MAX_BYTES = toNumberEnv(process.env.PDF_MAX_BYTES, 12000000);
const PDF_TEXT_TIMEOUT_MS = toNumberEnv(process.env.PDF_TEXT_TIMEOUT_MS, 30000);
const PDF_OCR_TIMEOUT_MS = toNumberEnv(process.env.PDF_OCR_TIMEOUT_MS, 120000);
const PDF_OCR_MAX_PAGES = toNumberEnv(process.env.PDF_OCR_MAX_PAGES, 8);
const PDF_ATTACHMENT_LIMIT = toNumberEnv(process.env.PDF_ATTACHMENT_LIMIT, 5);
const OCR_PAGE_TIMEOUT_MS = toNumberEnv(process.env.OCR_PAGE_TIMEOUT_MS, 30000);
const OCR_LANGS = process.env.OCR_LANGS || 'por+eng';
const AI_EXTRACTION_TIMEOUT_MS = toNumberEnv(process.env.AI_EXTRACTION_TIMEOUT_MS, 90000);
const SYLLABUS_MARKERS: RegExp[] = [
  /\bconteudo\s*programatico\b/,
  /\bconteudos\s*programaticos\b/,
  /\bprograma(\s*de)?\s*(conteudo|estudos|conhecimentos|materias|disciplinas)\b/,
  /\bprograma\s*(da|das)?\s*provas?\b/,
  /\bprograma\s*de\s*prova(s)?\s*(objetiva|discursiva)?\b/,
  /\bconteudo(s)?\s*(da|das)?\s*provas?\b/,
  /\bconteudo(s)?\s*(cobrado|previsto|exigido)\b/,
  /\bementa(s)?\b/,
  /\btemario\b/,
  /\brelacao\s*de\s*conteudos\b/,
  /\bconteudo(s)?\s*(basico|especifico|geral)\b/,
  /\bconhecimentos\s*(basicos|especificos|gerais)\b/,
  /\bprova\s*(objetiva|discursiva|pratica|oral)\b/,
  /\bestrutura\s*da\s*prova\b/,
  /\bcomposicao\s*da\s*prova\b/,
  /\banexo\s+[ivx0-9]+\b/,
];
const EXAM_MATRIX_MARKERS: RegExp[] = [
  /\btabela\s*de\s*provas?\b/,
  /\bquadro\s*de\s*provas?\b/,
  /\bquadro\s*demonstrativo\s*de\s*provas?\b/,
  /\bprograma\s*de\s*prova(s)?\s*(objetiva|discursiva)?\b/,
  /\bdistribuicao\s*de\s*questoes\b/,
  /\bnumero\s*de\s*questoes\b/,
  /\bquantidade\s*de\s*questoes\b/,
  /\bquestoes\s*por\s*disciplina\b/,
  /\bquantitativo\s*de\s*questoes\b/,
  /\bestrutura\s*da\s*prova\b/,
  /\bcomposicao\s*da\s*prova\b/,
  /\bprova\s*objetiva\b/,
  /\bprova\s*discursiva\b/,
  /\bcriterios\s*de\s*avaliacao\b/,
  /\bpeso\b/,
  /\bpontuacao\b/,
  /\bvalor\s*de\s*cada\s*questao\b/,
];
const SYLLABUS_STOP_MARKERS: RegExp[] = [
  /das inscri/,
  /dos requisitos/,
  /\brequisitos?\b/,
  /do preenchimento/,
  /das vagas/,
  /taxa de inscr/,
  /cronograma/,
  /quadro demonstrativo/,
  /atribui/,
  /das pessoas com defici/,
  /necessidades (visuais|auditivas|complementares)/,
  /\btitulac/,
  /\bformacao\b/,
  /\bescolaridade\b/,
  /\bdiploma\b/,
  /disposic/,
  /recursos/,
  /resultado/,
  /homolog/,
  /convoca/,
];
const SYLLABUS_WINDOW_MAX_CHARS = 20000;
const VALID_EDITAL_STATUSES = new Set<EditalStatus>([
  'rascunho',
  'publicado',
  'em_andamento',
  'suspenso',
  'cancelado',
  'concluido',
]);
const SIGNAL_WORDS = [
  'edital',
  'concurso',
  'inscricao',
  'prova',
  'cargo',
  'vagas',
  'conteudo',
  'programa',
  'disciplinas',
  'materias',
  'anexo',
  'publico',
  'publica',
  'data',
  'prazo',
];
const COMMON_WORDS = ['de', 'da', 'do', 'para', 'que', 'em', 'no', 'na'];
const DISCIPLINE_EXCLUDE_PATTERNS: RegExp[] = [
  /^(do|da|das|dos)\s+/,
  /^anexo\b/,
  /(vagas|inscr|preenchimento|reserva|cadastro|defici|pcd|necessidades|atribui|disposic|requisit|document|taxa|cronograma|resultado|recurso|convoca|homolog|quadro demonstrativo)/,
  /(diploma|titulac|graduac|pos\-?graduac|escolaridade|formacao|retribuic|comprov|certidao|registro|apresenta|entrega|identidade|cpf|rg|carteira|posse|nomea|investidura|lotacao|remunerac|salario|carga horaria|vencimento|prazo|validade)/,
  /(cartao resposta|cartao de resposta|folha de resposta|caderno de prova|prova pratica|prova discursiva|prova oral|prova de titulos|prova objetiva)/,
  /(fiscal|sala|portao|horario|local de prova|instruc|orienta|assinatura|preenchimento)/,
  /(seletivo de provas|prova e um cartao|prova e um cartao resposta)/,
  /\bprefeitura\b/,
  /\bmunicipio\s+de\b/,
  /\bestado\s+(do|da|de)\b/,
  /\bgoverno\s+(do|da|de)\b/,
  /\bsecretaria\b/,
  /\bru[a-z]\b|\brua\b|\bavenida\b|\bav\.?\b|\btravessa\b|\brodovia\b|\bestrada\b|\bbairro\b|\bcep\b/,
  /\btelefone\b|\bfone\b|\bwhatsapp\b|\bemail\b|\be-mail\b|\bcontato\b/,
  /\bsite\b|www\.|https?:\/\//,
  /\b[a-z]+\/[a-z]{2}\b/,
  /^\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{2,4}(,\s*\d{1,2}:\d{2})?$/,
  /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2})?$/,
  /^\d{1,2}:\d{2}(?:\s*-\s*\d{1,2}:\d{2})?$/,
  /^total$/,
];
const GENERIC_TOPIC_PATTERNS: RegExp[] = [
  /\bconteudo(s)?\b/,
  /\bprograma(tico)?\b/,
  /\bementa(s)?\b/,
  /\btopicos?\b/,
  /\bassuntos?\b/,
  /\btemas?\b/,
];
const GENERIC_DISCIPLINA_PATTERNS: RegExp[] = [
  /^conteudo programatico$/,
  /^conteudos programaticos?$/,
  /^conteudo$/,
  /^conteudos$/,
  /^programa( de)? (estudos|conteudo|prova|provas)$/,
  /^programa$/,
  /^disciplinas$/,
  /^materias$/,
  /^total$/,
];
const GENERIC_CARGO_PATTERNS: RegExp[] = [
  /^cargo$/,
  /^cargos$/,
  /^cargo\(s\)$/,
  /^funcoes$/,
  /^funcoes?$/,
];
const execFileAsync = promisify(execFile);

function toNumberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = (value ?? '').trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function isTesseractMissingLanguage(err: any): boolean {
  const message = `${err?.stderr || ''} ${err?.message || ''}`.toLowerCase();
  return (
    message.includes('failed loading language') ||
    message.includes('error opening data file') ||
    message.includes('could not initialize tesseract') ||
    message.includes('tessdata')
  );
}

function normalizeEditalStatus(value?: string): EditalStatus {
  if (!value) return 'rascunho';
  const normalized = value.toLowerCase().trim() as EditalStatus;
  return VALID_EDITAL_STATUSES.has(normalized) ? normalized : 'rascunho';
}

function compactTextForAi(text: string): string {
  const compact = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  return compact.length > AI_TEXT_LIMIT ? compact.slice(0, AI_TEXT_LIMIT) : compact;
}

function extractTextWithBreaks(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|p|div|li|h[1-6]|tr|td|th|ul|ol)[^>]*>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|td|th|ul|ol)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractSectionByMarkers(text: string, markers: RegExp[]): string {
  if (!text) return '';
  const normalized = normalizeSignalText(text);
  const indices = markers
    .map((pattern) => normalized.search(pattern))
    .filter((idx) => idx >= 0);
  if (indices.length === 0) return '';
  const unique = Array.from(new Set(indices)).sort((a, b) => a - b);
  const slices = unique
    .map((idx) => {
      const start = Math.max(0, idx - 80);
      const window = normalized.slice(idx);
      const stopMatches = SYLLABUS_STOP_MARKERS
        .map((pattern) => {
          const hit = window.search(pattern);
          return hit >= 0 ? idx + hit : -1;
        })
        .filter((hit) => hit > idx + 40);
      const stopIndex = stopMatches.length ? Math.min(...stopMatches) : -1;
      const endLimit = Math.min(normalized.length, idx + SYLLABUS_WINDOW_MAX_CHARS);
      const end = stopIndex > idx ? Math.min(stopIndex, endLimit) : endLimit;
      return text.slice(start, end).trim();
    })
    .filter(Boolean);
  return slices.join('\n\n---\n\n');
}

function extractSyllabusSection(text: string): string {
  return extractSectionByMarkers(text, SYLLABUS_MARKERS);
}

function extractExamMatrixSection(text: string): string {
  return extractSectionByMarkers(text, EXAM_MATRIX_MARKERS);
}

function extractProgrammaticContentFromText(text: string): {
  disciplinas: EditalDisciplina[];
  conteudo_programatico: Record<string, any>;
} {
  const disciplinas: EditalDisciplina[] = [];
  const conteudo_programatico: Record<string, any> = {};

  if (!text) return { disciplinas, conteudo_programatico };

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const topicsByDisc = new Map<string, string[]>();
  const pendingTopics: string[] = [];
  let currentDisc: string | null = null;

  const addDisciplina = (raw: string) => {
    const nome = normalizeDisciplinaName(normalizeAiLabel(raw));
    if (!nome || isDisallowedSyllabusItem(nome) || isGenericDisciplinaName(nome)) return null;
    if (!topicsByDisc.has(nome)) topicsByDisc.set(nome, []);
    return nome;
  };

  const addTopic = (disc: string | null, rawTopic: string) => {
    const topic = rawTopic.replace(/\s+/g, ' ').replace(/[;,.]+$/, '').trim();
    if (!topic || isDisallowedSyllabusItem(topic) || isGenericTopicName(topic)) return;
    if (disc) {
      const current = topicsByDisc.get(disc) || [];
      topicsByDisc.set(disc, [...current, topic]);
    } else {
      pendingTopics.push(topic);
    }
  };

  const isLikelyHeading = (raw: string) => {
    if (raw.length > 80) return false;
    if (/[:;]|\b\d{1,3}\b/.test(raw)) return false;
    const normalized = normalizeSignalText(raw);
    if (isDisallowedSyllabusItem(normalized) || isGenericDisciplinaName(normalized)) return false;
    const letters = raw.replace(/[^A-Za-zÀ-ú]/g, '');
    if (letters.length < 4) return false;
    const upper = letters.replace(/[^A-ZÀ-Ú]/g, '').length;
    return upper / letters.length >= 0.7 || /^[A-ZÀ-Ú]/.test(raw);
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line) continue;

    const inline = line.match(/^(.{3,80}?)\s*[:–—-]\s*(.+)$/);
    if (inline?.[1] && inline?.[2]) {
      const disc = addDisciplina(inline[1].replace(/[.]+$/, '').trim());
      const topics = inline[2]
        .split(/;|(?<=\.)\s+(?=[A-ZÀ-Ú])/g)
        .map((entry) => entry.replace(/\s+/g, ' ').trim())
        .filter((entry) => entry);
      topics.forEach((topic) => addTopic(disc, topic));
      if (disc) currentDisc = disc;
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)/);
    const enumMatch = line.match(/^\d+(?:\.\d+)*\s*[)\-.:]?\s+(.+)/);
    const letterMatch = line.match(/^[a-z]\)\s+(.+)/i);
    const bullet = bulletMatch?.[1] || enumMatch?.[1] || letterMatch?.[1];
    if (bullet) {
      addTopic(currentDisc, bullet);
      continue;
    }

    if (isLikelyHeading(line)) {
      const disc = addDisciplina(line.replace(/[.]+$/, '').trim());
      if (disc) currentDisc = disc;
      continue;
    }

    if (currentDisc) {
      addTopic(currentDisc, line);
    }
  }

  if (topicsByDisc.size === 0 && pendingTopics.length) {
    const looksLikeDiscList = pendingTopics.every(
      (item) => item.length <= 60 && !/[:;]/.test(item)
    );
    if (looksLikeDiscList) {
      pendingTopics.forEach((item) => addDisciplina(item));
    }
  }

  topicsByDisc.forEach((topics, nome) => {
    disciplinas.push({ nome });
    conteudo_programatico[nome] = uniqueStrings(topics).map((topic) => ({
      nome: topic,
      subtopicos: [],
    }));
  });

  return { disciplinas, conteudo_programatico };
}

async function withTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
}

function normalizeSignalText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isJinaMarkdown(content: string): boolean {
  return content.includes('Markdown Content:') && content.includes('URL Source:');
}

function extractJinaMetadata(content: string): {
  title?: string;
  urlSource?: string;
  publishedTime?: string;
  markdown?: string;
} {
  const titleMatch = content.match(/^Title:\s*(.+)$/m);
  const urlMatch = content.match(/^URL Source:\s*(.+)$/m);
  const publishedMatch = content.match(/^Published Time:\s*(.+)$/m);
  const marker = 'Markdown Content:';
  const markerIndex = content.indexOf(marker);
  const markdown = markerIndex >= 0 ? content.slice(markerIndex + marker.length).trim() : undefined;
  return {
    title: titleMatch?.[1]?.trim(),
    urlSource: urlMatch?.[1]?.trim(),
    publishedTime: publishedMatch?.[1]?.trim(),
    markdown,
  };
}

function toJinaUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `https://r.jina.ai/http://${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function extractJcProgramFromMarkdown(markdown: string): {
  disciplinas: EditalDisciplina[];
  conteudo_programatico: Record<string, any>;
} {
  const disciplinas: EditalDisciplina[] = [];
  const conteudo_programatico: Record<string, any> = {};

  if (!markdown) return { disciplinas, conteudo_programatico };

  const lines = markdown
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim());
  const normalizedLines = lines.map((line) => normalizeSignalText(line));
  const markerIndex = normalizedLines.findIndex((line) =>
    line.includes('conteudo programatic') ||
    line.includes('programa de prova') ||
    line.includes('o que vai cair')
  );
  if (markerIndex < 0) return { disciplinas, conteudo_programatico };

  const inferDisciplina = () => {
    const windowStart = Math.max(0, markerIndex - 8);
    for (let i = markerIndex; i >= windowStart; i -= 1) {
      const raw = lines[i];
      const match = raw.match(/temas de\s+([^:]+?)(?:\s+indicados|$)/i);
      if (match?.[1]) return normalizeAiLabel(match[1].replace(/[.]+$/, '').trim());
      const matchAlt = raw.match(/conteudo programatico\s+(?:de|para)\s+([^:]+?)(?:\s+|$)/i);
      if (matchAlt?.[1]) return normalizeAiLabel(matchAlt[1].replace(/[.]+$/, '').trim());
    }
    return '';
  };

  const bulletItems: string[] = [];
  for (let i = markerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) {
      if (bulletItems.length) break;
      continue;
    }
    if (/^#{2,}\s+/.test(line) || /^[-*]{3,}$/.test(line)) {
      if (bulletItems.length) break;
    }
    if (/^[-*•]\s+/.test(line)) {
      const cleaned = line
        .replace(/^[-*•]\s+/, '')
        .replace(/^\d+(?:\.\d+)*\s*/g, '')
        .trim();
      if (cleaned) bulletItems.push(cleaned);
    }
  }

  if (!bulletItems.length) return { disciplinas, conteudo_programatico };

  const filtered = bulletItems.filter((item) => !isDisallowedSyllabusItem(item));
  if (!filtered.length) return { disciplinas, conteudo_programatico };

  const looksLikeDiscList = filtered.every(
    (item) =>
      item.length <= 60 &&
      !/[:;]/.test(item) &&
      !/\d+\.\d+/.test(item)
  );

  const disciplinaTopicos = new Map<string, string[]>();
  filtered.forEach((item) => {
    const match = item.match(/^([^:]{3,}?)\s*[:–-]\s*(.+)$/);
    if (!match) return;
    const nome = normalizeAiLabel(match[1].replace(/[.]+$/, '').trim());
    const raw = match[2].trim();
    if (!nome || isGenericDisciplinaName(nome)) return;
    const topics = raw
      .split(/;|(?<=\.)\s+(?=[A-ZÁ-Ú])/g)
      .map((entry) => entry.replace(/\s+/g, ' ').trim())
      .filter((entry) => entry && !isGenericTopicName(entry));
    if (!topics.length) return;
    const current = disciplinaTopicos.get(nome) || [];
    disciplinaTopicos.set(nome, [...current, ...topics]);
  });

  if (disciplinaTopicos.size) {
    disciplinaTopicos.forEach((topics, nome) => {
      disciplinas.push({ nome });
      conteudo_programatico[nome] = topics.map((topic) => ({
        nome: topic,
        subtopicos: [],
      }));
    });
  } else if (looksLikeDiscList) {
    filtered.forEach((item) => {
      const nome = normalizeAiLabel(item);
      if (!nome || isGenericDisciplinaName(nome)) return;
      disciplinas.push({ nome });
      conteudo_programatico[nome] = [];
    });
  } else {
    const disciplinaNome = inferDisciplina() || 'Conteudo Programatico';
    const topicos = filtered
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter((item) => item && !isGenericTopicName(item))
      .map((item) => ({ nome: item, subtopicos: [] }));
    if (!isGenericDisciplinaName(disciplinaNome)) {
      disciplinas.push({ nome: disciplinaNome });
      conteudo_programatico[disciplinaNome] = topicos;
    }
  }

  return { disciplinas, conteudo_programatico };
}

function isJcConcursosSource(source?: HarvestSource, url?: string): boolean {
  const hint = `${source?.name || ''} ${source?.base_url || ''} ${url || ''}`.toLowerCase();
  return hint.includes('jcconcursos.com.br') || hint.includes('jc concursos');
}

function isJcConcursosListPage(url?: string): boolean {
  if (!url) return false;
  return /\/concursos\//i.test(url) && !/\/concurso\//i.test(url);
}

function mapJcStatusToEditalStatus(status?: string): EditalStatus | undefined {
  const normalized = normalizeSignalText(status || '');
  if (!normalized) return undefined;
  if (normalized.includes('suspenso')) return 'suspenso';
  if (normalized.includes('cancelado')) return 'cancelado';
  if (normalized.includes('encerrado') || normalized.includes('concluido')) return 'concluido';
  if (normalized.includes('aberto') || normalized.includes('em andamento') || normalized.includes('inscricao')) {
    return 'em_andamento';
  }
  if (normalized.includes('publicado')) return 'publicado';
  if (normalized.includes('previsto') || normalized.includes('autorizado')) return 'rascunho';
  return undefined;
}

function extractCurrencyToken(value: string): string | undefined {
  const match = value.match(/R\$\s*([0-9.]+,[0-9]{2})/i);
  return match ? match[1] : undefined;
}

function extractJcConcursosSummary($: cheerio.CheerioAPI, rawHtml?: string): Record<string, any> {
  const summary: Record<string, any> = {};

  const extractList = (cell: cheerio.Cheerio<any>) => {
    const items = cell
      .find('a')
      .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean);
    if (items.length) return items;
    const raw = cell.text().replace(/\s+/g, ' ').trim();
    return raw ? raw.split(',').map((item) => item.trim()).filter(Boolean) : [];
  };

  $('table .col-concursos tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;
    const label = normalizeSignalText(cells.first().text());
    const valueCell = cells.last();
    const valueText = valueCell.text().replace(/\s+/g, ' ').trim();
    if (!label || !valueText) return;

    if (label.includes('orgao')) {
      summary.orgao = valueText;
      return;
    }
    if (label.includes('vagas')) {
      summary.numero_vagas = parseOptionalNumber(valueText);
      return;
    }
    if (label.includes('taxa')) {
      summary.taxa_inscricao = extractCurrencyToken(valueText);
      return;
    }
    if (label.includes('cargos')) {
      summary.cargos = extractList(valueCell);
      return;
    }
    if (label.includes('areas')) {
      summary.areas = extractList(valueCell);
      return;
    }
    if (label.includes('escolaridade')) {
      summary.escolaridade = extractList(valueCell);
      return;
    }
    if (label.includes('salario')) {
      summary.faixa_salario = valueText;
      return;
    }
    if (label.includes('organizadora')) {
      const list = extractList(valueCell);
      summary.banca = list[0] || valueText;
      return;
    }
    if (label.includes('estados')) {
      summary.localidade = extractList(valueCell).join(', ') || valueText;
    }
  });

  if (Object.keys(summary).length === 0 && rawHtml) {
    const markdown = extractJinaMetadata(rawHtml).markdown || rawHtml;
    const lines = markdown
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const match = line.match(/^\*\*([^*]+)\*\*\s*:?\s*(.+)$/);
      if (!match) continue;
      const labelRaw = match[1].trim();
      const valueRaw = match[2].trim();
      if (!valueRaw) continue;
      const label = normalizeKey(labelRaw);
      const linkedItems = extractMarkdownLinks(valueRaw)
        .map((item) => item.text.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      const valueText = stripMarkdownLinks(valueRaw).replace(/\s+/g, ' ').trim();
      const listFallback = valueText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const listValue = linkedItems.length ? linkedItems : listFallback;

      if (label.includes('orgao')) {
        summary.orgao = valueText;
        continue;
      }
      if (label.includes('vagas')) {
        summary.numero_vagas = parseOptionalNumber(valueText);
        continue;
      }
      if (label.includes('taxa')) {
        summary.taxa_inscricao = extractCurrencyToken(valueText);
        continue;
      }
      if (label.includes('cargos')) {
        summary.cargos = listValue;
        continue;
      }
      if (label.includes('areas')) {
        summary.areas = listValue;
        continue;
      }
      if (label.includes('escolaridade')) {
        summary.escolaridade = listValue;
        continue;
      }
      if (label.includes('salario')) {
        summary.faixa_salario = valueText;
        continue;
      }
      if (label.includes('organizadora') || label.includes('banca')) {
        summary.banca = listValue[0] || valueText;
        continue;
      }
      if (label.includes('estados')) {
        summary.localidade = listValue.join(', ') || valueText;
      }
    }
  }

  return summary;
}

function classifyPdfKind(label?: string, url?: string): string {
  const normalized = normalizeSignalText(`${label || ''} ${url || ''}`);
  if (normalized.includes('gabarito')) return 'gabarito';
  if (normalized.includes('prova')) return 'prova';
  if (normalized.includes('retifica')) return 'retificacao';
  if (normalized.includes('anexo')) return 'anexo';
  if (normalized.includes('edital') || normalized.includes('abertura')) return 'edital';
  return 'outro';
}

function extractMarkdownLinks(content: string): Array<{ text: string; url: string }> {
  const results: Array<{ text: string; url: string }> = [];
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const text = match[1].trim();
    const url = match[2].trim();
    if (!url) continue;
    results.push({ text, url });
  }
  return results;
}

function stripMarkdownLinks(value: string): string {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function scorePdfLink(label?: string, url?: string, inLinksSection?: boolean): number {
  const normalized = normalizeSignalText(`${label || ''} ${url || ''}`);
  let score = 0;
  if (normalized.includes('edital')) score += 5;
  if (normalized.includes('abertura')) score += 3;
  if (normalized.includes('anexo')) score += 1;
  if (normalized.includes('retifica')) score -= 1;
  if (normalized.includes('gabarito')) score -= 2;
  if (normalized.includes('prova')) score -= 1;
  if (inLinksSection) score += 2;
  return score;
}

function extractLinkSectionLinks(html: string, baseUrl?: string): { pdfLinks: PdfLink[]; provasUrl?: string } {
  try {
    const $ = cheerio.load(html);
    const pdfLinks: PdfLink[] = [];
    let provasUrl: string | undefined;

    $('#links a, aside#links a').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const normalized = normalizeUrl(href, baseUrl);
      if (!normalized) return;
      const label = ($(el).text() || $(el).attr('title') || '').trim();
      const isPdf = /\.pdf(\?|$)/i.test(normalized);
      const inLinksSection = true;
      if (isPdf) {
        pdfLinks.push({
          url: normalized,
          label,
          kind: classifyPdfKind(label, normalized),
          score: scorePdfLink(label, normalized, inLinksSection),
        });
        return;
      }
      const normalizedLabel = normalizeSignalText(label);
      if (normalizedLabel.includes('prova')) {
        provasUrl = normalized;
      }
    });

    return { pdfLinks, provasUrl };
  } catch {
    return { pdfLinks: [] };
  }
}

function extractPdfLinks(html: string, baseUrl?: string): PdfLink[] {
  try {
    const $ = cheerio.load(html);
    const links: PdfLink[] = [];
    const seen = new Set<string>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const normalized = normalizeUrl(href, baseUrl);
      if (!normalized || !/\.pdf(\?|$)/i.test(normalized)) return;
      if (seen.has(normalized)) return;
      const label = ($(el).text() || $(el).attr('title') || '').trim();
      const inLinksSection = $(el).closest('#links, aside#links').length > 0;
      const kind = classifyPdfKind(label, normalized);
      links.push({
        url: normalized,
        label,
        kind,
        score: scorePdfLink(label, normalized, inLinksSection),
      });
      seen.add(normalized);
    });

    if (isJinaMarkdown(html)) {
      extractMarkdownLinks(html).forEach(({ text, url }) => {
        if (!/\.pdf(\?|$)/i.test(url)) return;
        const normalized = normalizeUrl(url, baseUrl);
        if (!normalized || seen.has(normalized)) return;
        const label = text.trim();
        links.push({
          url: normalized,
          label,
          kind: classifyPdfKind(label, normalized),
          score: scorePdfLink(label, normalized, false),
        });
        seen.add(normalized);
      });
    }

    return links;
  } catch {
    return [];
  }
}

function mergePdfLinks(primary: PdfLink[], secondary: PdfLink[]): PdfLink[] {
  const merged: PdfLink[] = [];
  const seen = new Set<string>();
  const push = (item: PdfLink) => {
    if (!item.url || seen.has(item.url)) return;
    seen.add(item.url);
    merged.push(item);
  };
  primary.forEach(push);
  secondary.forEach(push);
  return merged;
}

function pickBestPdfLink(links: PdfLink[]): PdfLink | undefined {
  if (!links.length) return undefined;
  const sorted = [...links].sort((a, b) => (b.score || 0) - (a.score || 0));
  return sorted[0];
}

function normalizePdfLinks(raw: any): PdfLink[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    return [{ url: raw, label: undefined, kind: classifyPdfKind(undefined, raw), score: scorePdfLink(undefined, raw, false) }];
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => {
      if (typeof item === 'string') {
        return {
          url: item,
          label: undefined,
          kind: classifyPdfKind(undefined, item),
          score: scorePdfLink(undefined, item, false),
        };
      }
      if (item && typeof item === 'object') {
        const url = item.url || item.href || item.link;
        if (!url) return null;
        const label = item.label || item.title || item.nome;
        const kind = item.kind || item.tipo || classifyPdfKind(label, url);
        const score = typeof item.score === 'number' ? item.score : scorePdfLink(label, url, false);
        return { url, label, kind, score };
      }
      return null;
    })
    .filter((item) => item && item.url);
}

function buildPdfFilename(label: string | undefined, kind: string, index: number): string {
  const base = label || kind || 'arquivo';
  const slug = normalizeSignalText(base).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const suffix = index > 1 ? `-${index}` : '';
  return `${slug || kind || 'arquivo'}${suffix}.pdf`;
}

function sortArquivos(arquivos: EditalArquivo[]): EditalArquivo[] {
  const order = ['edital', 'retificacao', 'anexo', 'prova', 'gabarito', 'outro'];
  return [...arquivos].sort((a, b) => {
    const aIndex = order.indexOf((a.tipo || '').toLowerCase());
    const bIndex = order.indexOf((b.tipo || '').toLowerCase());
    const aRank = aIndex >= 0 ? aIndex : order.length;
    const bRank = bIndex >= 0 ? bIndex : order.length;
    if (aRank !== bRank) return aRank - bRank;
    return (a.nome || '').localeCompare(b.nome || '');
  });
}

type ProcessingOverrides = {
  collectedAt?: string | Date | null;
  hasEditalPdf?: boolean;
  hasParsedText?: boolean;
  hasMaterias?: boolean;
  hasMateriasDetalhadas?: boolean;
  hasCronograma?: boolean;
  ocrProcessedAt?: string | Date | null;
  ocrStatus?: 'ok' | 'falhou' | 'nao_necessario' | null;
  ocrMethod?: 'pdftotext' | 'pdf-parse' | 'ocr' | 'none' | null;
  ocrWords?: number | null;
  ocrUsed?: boolean | null;
};

const toIsoString = (value?: string | Date | null): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return undefined;
};

const normalizeProcessingSteps = (raw: any): EditalProcessingSteps => {
  if (!raw || typeof raw !== 'object') return {};
  const normalized: EditalProcessingSteps = {};
  const keys: Array<keyof EditalProcessingSteps> = [
    'coletado_at',
    'edital_encontrado_at',
    'edital_processado_at',
    'ocr_processado_at',
    'ocr_status',
    'ocr_method',
    'ocr_words',
    'ocr_used',
    'materias_encontradas_at',
    'materias_processadas_at',
    'cronograma_processado_at',
    'last_error',
  ];
  for (const key of keys) {
    if (!(key in raw)) continue;
    if (key === 'last_error') {
      if (typeof raw[key] === 'string') normalized.last_error = raw[key] as string;
      continue;
    }
    if (key === 'ocr_status') {
      if (typeof raw[key] === 'string') normalized.ocr_status = raw[key] as any;
      continue;
    }
    if (key === 'ocr_method') {
      if (typeof raw[key] === 'string') normalized.ocr_method = raw[key] as any;
      continue;
    }
    if (key === 'ocr_words') {
      if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) {
        normalized.ocr_words = raw[key] as number;
      } else if (typeof raw[key] === 'string') {
        const parsed = Number(raw[key]);
        if (Number.isFinite(parsed)) normalized.ocr_words = parsed;
      }
      continue;
    }
    if (key === 'ocr_used') {
      if (typeof raw[key] === 'boolean') {
        normalized.ocr_used = raw[key] as boolean;
      }
      continue;
    }
    const asIso = toIsoString(raw[key] as any);
    normalized[key] = asIso ?? null;
  }
  return normalized;
};

const hasEditalAttachment = (link?: string, arquivos?: EditalArquivo[]): boolean => {
  if (link && /\.pdf(\?|$)/i.test(link)) return true;
  const list = Array.isArray(arquivos) ? arquivos : [];
  return list.some((arquivo) => {
    const tipo = (arquivo.tipo || '').toLowerCase();
    const nome = (arquivo.nome || '').toLowerCase();
    const url = (arquivo.url || '').toLowerCase();
    return tipo === 'edital' || nome.includes('edital') || url.includes('.pdf');
  });
};

const hasConteudoProgramaticoData = (
  conteudo: Record<string, any> | undefined,
  disciplinas: EditalDisciplina[] = []
): boolean => {
  if (conteudo && typeof conteudo === 'object') {
    const values = Object.values(conteudo);
    if (values.some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value))) {
      return true;
    }
  }
  return disciplinas.some((disc) => {
    const topicos = Array.isArray((disc as any)?.topicos) ? (disc as any).topicos : [];
    const conteudoDisc = Array.isArray((disc as any)?.conteudo_programatico) ? (disc as any).conteudo_programatico : [];
    return topicos.length > 0 || conteudoDisc.length > 0;
  });
};

const hasParsedDataFromEdital = (edital: any): boolean => {
  return Boolean(
    (edital?.descricao && String(edital.descricao).trim().length > 0) ||
      edital?.data_publicacao ||
      edital?.data_prova_prevista ||
      edital?.data_inscricao_inicio ||
      edital?.data_inscricao_fim ||
      (edital?.numero_vagas && edital.numero_vagas > 0) ||
      (edital?.numero_inscritos && edital.numero_inscritos > 0) ||
      edital?.taxa_inscricao
  );
};

const buildProcessingSteps = (
  base: EditalProcessingSteps,
  flags: {
    collectedAt?: string;
    hasEditalPdf: boolean;
    hasParsedText: boolean;
    hasMaterias: boolean;
    hasMateriasDetalhadas: boolean;
    hasCronograma: boolean;
    ocrProcessedAt?: string | null;
    ocrStatus?: 'ok' | 'falhou' | 'nao_necessario' | null;
    ocrMethod?: 'pdftotext' | 'pdf-parse' | 'ocr' | 'none' | null;
    ocrWords?: number | null;
    ocrUsed?: boolean | null;
  }
): EditalProcessingSteps => {
  const now = new Date().toISOString();
  return {
    coletado_at: base.coletado_at || flags.collectedAt || now,
    edital_encontrado_at: flags.hasEditalPdf ? (base.edital_encontrado_at || now) : null,
    edital_processado_at: flags.hasParsedText ? (base.edital_processado_at || now) : null,
    ocr_processado_at: flags.ocrProcessedAt
      ? (base.ocr_processado_at || flags.ocrProcessedAt)
      : (base.ocr_processado_at ?? null),
    ocr_status: flags.ocrStatus === undefined ? (base.ocr_status ?? null) : flags.ocrStatus,
    ocr_method: flags.ocrMethod === undefined ? (base.ocr_method ?? null) : flags.ocrMethod,
    ocr_words: flags.ocrWords === undefined ? (base.ocr_words ?? null) : flags.ocrWords,
    ocr_used: flags.ocrUsed === undefined ? (base.ocr_used ?? null) : flags.ocrUsed,
    materias_encontradas_at: flags.hasMaterias ? (base.materias_encontradas_at || now) : null,
    materias_processadas_at: flags.hasMateriasDetalhadas ? (base.materias_processadas_at || now) : null,
    cronograma_processado_at: flags.hasCronograma ? (base.cronograma_processado_at || now) : null,
    last_error: base.last_error || null,
  };
};

export async function refreshEditalProcessingSteps(
  editalId: string,
  overrides?: ProcessingOverrides
): Promise<void> {
  if (!editalId) return;
  const { editalRepository } = await import('../repositories/editalRepository');
  const edital = await editalRepository.findById(editalId);
  if (!edital) return;

  const { rows } = await query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM edital_eventos WHERE edital_id = $1',
    [editalId]
  );
  const cronogramaCount = Number.parseInt(rows[0]?.count ?? '0', 10);

  const base = normalizeProcessingSteps((edital as any).processing_steps);
  const collectedAt = toIsoString(overrides?.collectedAt) || toIsoString((edital as any).created_at);
  const hasEditalPdf = overrides?.hasEditalPdf ?? hasEditalAttachment(edital.link_edital_completo, edital.arquivos);
  const hasMaterias = overrides?.hasMaterias ?? (Array.isArray(edital.disciplinas) && edital.disciplinas.length > 0);
  const hasMateriasDetalhadas =
    overrides?.hasMateriasDetalhadas ?? hasConteudoProgramaticoData(edital.conteudo_programatico, edital.disciplinas);
  const hasCronograma = overrides?.hasCronograma ?? cronogramaCount > 0;
  const hasParsedText = overrides?.hasParsedText ?? hasParsedDataFromEdital(edital);
  const ocrProcessedAt = toIsoString(overrides?.ocrProcessedAt) || base.ocr_processado_at || null;
  const ocrStatus =
    overrides?.ocrStatus === undefined ? (base.ocr_status ?? null) : overrides?.ocrStatus;
  const ocrMethod =
    overrides?.ocrMethod === undefined ? (base.ocr_method ?? null) : overrides?.ocrMethod;
  const ocrWords =
    overrides?.ocrWords === undefined ? (base.ocr_words ?? null) : overrides?.ocrWords;
  const ocrUsed =
    overrides?.ocrUsed === undefined ? (base.ocr_used ?? null) : overrides?.ocrUsed;

  const nextSteps = buildProcessingSteps(base, {
    collectedAt,
    hasEditalPdf,
    hasParsedText,
    hasMaterias,
    hasMateriasDetalhadas,
    hasCronograma,
    ocrProcessedAt,
    ocrStatus,
    ocrMethod,
    ocrWords,
    ocrUsed,
  });

  await editalRepository.update({ id: editalId, processing_steps: nextSteps }, undefined);
}

async function storePdfAttachments(
  editalId: string,
  pdfLinks: PdfLink[],
  existing: EditalArquivo[],
  preloaded: Map<string, Buffer> = new Map(),
  options?: { prefix?: string }
): Promise<{ arquivos: EditalArquivo[]; added: EditalArquivo[]; primaryUrl?: string }> {
  const existingArquivos = Array.isArray(existing) ? existing : [];
  const existingOrigins = new Set(existingArquivos.map((file) => file.origem_url).filter(Boolean));
  const existingUrls = new Set(existingArquivos.map((file) => file.url).filter(Boolean));
  const added: EditalArquivo[] = [];
  let primaryUrl: string | undefined;

  const unique = mergePdfLinks(pdfLinks, []);
  const limited = unique.slice(0, PDF_ATTACHMENT_LIMIT);

  for (let i = 0; i < limited.length; i++) {
    const link = limited[i];
    if (!link?.url) continue;
    if (existingOrigins.has(link.url)) continue;

    try {
      const buffer = preloaded.get(link.url) || await fetchBufferWithTimeout(link.url, PDF_FETCH_TIMEOUT_MS, PDF_MAX_BYTES);
      if (!isPdfBuffer(buffer)) {
        console.warn(`[harvest] Arquivo ignorado (nao PDF): ${link.url}`);
        continue;
      }
      const filename = buildPdfFilename(link.label, link.kind || 'edital', i + 1);
      const base64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
      const storedUrl = await FileStorageService.saveEditalPdf(base64, editalId, filename, {
        prefix: options?.prefix,
      });

      if (!existingUrls.has(storedUrl)) {
        const arquivo: EditalArquivo = {
          nome: link.label || filename.replace(/\.pdf$/i, ''),
          url: storedUrl,
          tipo: link.kind || classifyPdfKind(link.label, link.url),
          tamanho: buffer.length,
          data_upload: new Date().toISOString(),
          origem_url: link.url,
        };
        added.push(arquivo);
        existingUrls.add(storedUrl);
      }

      if (!primaryUrl && (link.kind || '').toLowerCase() === 'edital') {
        primaryUrl = storedUrl;
      }
    } catch (err) {
      console.warn('[harvest] Falha ao armazenar PDF', link.url, err);
    }
  }

  if (!primaryUrl && added.length) {
    primaryUrl = added[0].url;
  }

  return { arquivos: sortArquivos([...existingArquivos, ...added]), added, primaryUrl };
}

function collectPdfLinks(meta: any, fallbackUrl?: string): PdfLink[] {
  const metaLinks = normalizePdfLinks(meta?.pdf_links || meta?.pdfLinks || []);
  const provasLinks = normalizePdfLinks(meta?.provas_links || meta?.provasLinks || meta?.provas_url || []);
  const fallbackLinks = normalizePdfLinks(meta?.edital_url || meta?.original_url || fallbackUrl);
  const merged = mergePdfLinks(mergePdfLinks(metaLinks, provasLinks), fallbackLinks);
  if (fallbackUrl && /\.pdf(\?|$)/i.test(fallbackUrl)) {
    merged.push({
      url: fallbackUrl,
      label: undefined,
      kind: classifyPdfKind(undefined, fallbackUrl),
      score: scorePdfLink(undefined, fallbackUrl, false),
    });
  }
  const unique = mergePdfLinks(merged, []);
  return unique.sort((a, b) => (b.score || 0) - (a.score || 0));
}

function isDisallowedSyllabusItem(name?: string): boolean {
  if (!name) return true;
  const normalized = normalizeSignalText(name);
  if (!normalized) return true;
  if (!/[a-z]/.test(normalized)) return true;
  if (normalized.includes('@')) return true;
  if (normalized.includes('http') || normalized.includes('www.')) return true;
  const compact = normalized.replace(/\s+/g, '');
  if (compact.length > 24 && /^[a-z0-9+/=]+$/.test(compact)) return true;
  if (!normalized.includes(' ') && normalized.length > 30 && /^[a-z0-9+/=]+$/.test(normalized)) return true;
  return DISCIPLINE_EXCLUDE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isGenericTopicName(name?: string): boolean {
  if (!name) return true;
  const normalized = normalizeSignalText(name);
  if (!normalized) return true;
  return GENERIC_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isGenericDisciplinaName(name?: string): boolean {
  if (!name) return true;
  const normalized = normalizeSignalText(name);
  if (!normalized) return true;
  return GENERIC_DISCIPLINA_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeAiLabel(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    return String(value.nome || value.name || value.titulo || '').trim();
  }
  return '';
}

function normalizeDisciplinaName(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  const lower = normalizeSignalText(cleaned);
  const provaPrefix = lower.match(/^prova\s*(objetiva|discursiva|pratica|oral)?\s*(de)?\s*(.+)$/);
  if (provaPrefix && provaPrefix[3]) {
    const candidate = cleaned.slice(cleaned.toLowerCase().indexOf(provaPrefix[3].trim()));
    if (candidate && candidate.length >= 3) {
      cleaned = candidate.trim();
    }
  }
  return cleaned;
}

function normalizeAiDisciplinas(disciplinas: any[]): any[] {
  if (!Array.isArray(disciplinas)) return [];
  const expanded: any[] = [];

  for (const disc of disciplinas) {
    const discName = normalizeDisciplinaName(normalizeAiLabel(disc?.nome ?? disc));
    if (discName && isGenericDisciplinaName(discName) && Array.isArray(disc?.topicos) && disc.topicos.length) {
      for (const topico of disc.topicos) {
        const topicoNome = normalizeAiLabel(topico?.nome ?? topico);
        if (!topicoNome || isDisallowedSyllabusItem(topicoNome) || isGenericTopicName(topicoNome)) {
          continue;
        }
        const subtopicos = Array.isArray(topico?.subtopicos)
          ? topico.subtopicos.map(normalizeAiLabel).filter(Boolean)
          : [];
        const topicos = subtopicos.length
          ? subtopicos
              .filter((sub) => !isDisallowedSyllabusItem(sub))
              .map((sub) => ({ nome: sub, subtopicos: [] }))
          : [];
        expanded.push({
          nome: topicoNome,
          topicos,
        });
      }
      continue;
    }
    expanded.push(disc);
  }

  const merged = new Map<string, any>();
  for (const disc of expanded) {
    const name = normalizeAiLabel(disc?.nome ?? disc);
    if (!name || isDisallowedSyllabusItem(name)) continue;
    const key = normalizeDisciplinaKey(name);
    if (!merged.has(key)) {
      merged.set(key, {
        ...disc,
        nome: name,
        topicos: Array.isArray(disc?.topicos) ? disc.topicos : [],
      });
      continue;
    }
    const current = merged.get(key);
    if (!current.peso && disc?.peso) current.peso = disc.peso;
    if (!current.numero_questoes && disc?.numero_questoes) current.numero_questoes = disc.numero_questoes;
    const incomingTopicos = Array.isArray(disc?.topicos) ? disc.topicos : [];
    current.topicos = [...current.topicos, ...incomingTopicos];
  }

  return Array.from(merged.values());
}

function isGenericCargoName(name?: string): boolean {
  if (!name) return true;
  const normalized = normalizeSignalText(name);
  if (!normalized) return true;
  return GENERIC_CARGO_PATTERNS.some((pattern) => pattern.test(normalized));
}

function serializeDisciplina(disciplina: EditalDisciplina): string {
  const nome = normalizeDisciplinaKey(disciplina?.nome);
  const topicos = uniqueStrings(
    (Array.isArray(disciplina?.topicos) ? disciplina.topicos : [])
      .map((topico) => (typeof topico === 'string' ? topico : topico?.nome))
      .filter(Boolean)
      .map((topico) => normalizeSignalText(String(topico)))
  ).sort();
  const numero = parseOptionalNumber(disciplina?.numero_questoes) ?? 0;
  const peso = parseOptionalNumber(disciplina?.peso) ?? 0;
  return `${nome}|q:${numero}|p:${peso}|t:${topicos.join('|')}`;
}

function areSameDisciplinas(
  current: EditalDisciplina[] = [],
  next: EditalDisciplina[] = []
): boolean {
  if (current.length !== next.length) return false;
  const a = current.map(serializeDisciplina).sort().join('||');
  const b = next.map(serializeDisciplina).sort().join('||');
  return a === b;
}

function normalizeConteudoProgramaticoValue(value: any): { nome: string; subtopicos: string[] } | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const nome = value.trim();
    if (!nome) return null;
    return { nome, subtopicos: [] };
  }
  if (typeof value === 'object') {
    const nome = normalizeAiLabel(value?.nome ?? value?.titulo ?? value?.name);
    if (!nome) return null;
    const subtopicos = uniqueStrings(
      Array.isArray(value?.subtopicos) ? value.subtopicos.map((sub: any) => normalizeAiLabel(sub)) : []
    );
    return { nome, subtopicos };
  }
  return null;
}

function sanitizeDisciplinas(disciplinas: EditalDisciplina[] = []): EditalDisciplina[] {
  if (!Array.isArray(disciplinas)) return [];
  const byKey = new Map<string, EditalDisciplina>();

  for (const disc of disciplinas) {
    const nome = normalizeDisciplinaName(normalizeAiLabel(disc?.nome ?? disc));
    if (!nome || isDisallowedSyllabusItem(nome) || isGenericDisciplinaName(nome)) continue;
    const topicosRaw = Array.isArray(disc?.topicos) ? disc.topicos : [];
    const topicos = uniqueStrings(
      topicosRaw
        .map((topico) => (typeof topico === 'string' ? topico : topico?.nome))
        .filter(Boolean)
        .map((topico) => String(topico).trim())
        .filter((topico) => topico && !isDisallowedSyllabusItem(topico) && !isGenericTopicName(topico))
    );
    const numero_questoes = parseOptionalNumber(disc?.numero_questoes);
    const peso = parseOptionalNumber(disc?.peso);
    const key = normalizeDisciplinaKey(nome);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, {
        ...disc,
        nome,
        numero_questoes: numero_questoes ?? undefined,
        peso: peso ?? undefined,
        topicos,
      });
      continue;
    }
    if (!current.numero_questoes && numero_questoes) current.numero_questoes = numero_questoes;
    if (!current.peso && peso) current.peso = peso;
    if ((!current.topicos || current.topicos.length === 0) && topicos.length) current.topicos = topicos;
  }

  return Array.from(byKey.values());
}

function sanitizeConteudoProgramatico(
  conteudo: Record<string, any> = {},
  disciplinas: EditalDisciplina[] = []
): Record<string, any> {
  if (!conteudo || typeof conteudo !== 'object') return {};
  const allowed = disciplinas.length
    ? new Set(disciplinas.map((disc) => normalizeDisciplinaKey(disc?.nome)).filter(Boolean))
    : null;
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(conteudo)) {
    const nome = normalizeAiLabel(key);
    if (!nome || isDisallowedSyllabusItem(nome) || isGenericDisciplinaName(nome)) continue;
    const normalizedKey = normalizeDisciplinaKey(nome);
    if (allowed && !allowed.has(normalizedKey)) continue;
    const items = Array.isArray(value) ? value : [];
    const normalizedItems = items
      .map(normalizeConteudoProgramaticoValue)
      .filter(Boolean)
      .map((item) => ({
        nome: item?.nome ? String(item.nome).trim() : '',
        subtopicos: uniqueStrings(
          Array.isArray(item?.subtopicos) ? item.subtopicos.map((sub) => normalizeAiLabel(sub)) : []
        ),
      }))
      .filter((item) => item.nome && !isDisallowedSyllabusItem(item.nome) && !isGenericTopicName(item.nome))
      .map((item) => ({
        nome: item.nome,
        subtopicos: item.subtopicos.filter(
          (sub) => sub && !isDisallowedSyllabusItem(sub) && !isGenericTopicName(sub)
        ),
      }))
      .filter((item) => item.nome && (item.subtopicos.length > 0 || !isGenericTopicName(item.nome)));

    if (normalizedItems.length > 0) {
      cleaned[nome] = normalizedItems;
    }
  }

  return cleaned;
}

function areSameConteudoProgramatico(
  current: Record<string, any> = {},
  next: Record<string, any> = {}
): boolean {
  const normalize = (input: Record<string, any>) => {
    const keys = Object.keys(input).sort();
    return keys.map((key) => {
      const items = Array.isArray(input[key]) ? input[key] : [];
      const normalizedItems = items
        .map(normalizeConteudoProgramaticoValue)
        .filter(Boolean)
        .map((item) => ({
          nome: normalizeSignalText(String(item?.nome || '')),
          subtopicos: uniqueStrings(
            Array.isArray(item?.subtopicos) ? item.subtopicos.map((sub) => normalizeSignalText(String(sub))) : []
          ).sort(),
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
      return `${normalizeSignalText(key)}:${JSON.stringify(normalizedItems)}`;
    }).join('||');
  };

  return normalize(current) === normalize(next);
}

function isLowDetailExtraction(aiResult: { disciplinas?: any[] }): boolean {
  const disciplinas = Array.isArray(aiResult?.disciplinas) ? aiResult.disciplinas : [];
  if (disciplinas.length === 0) return true;
  const topicos = disciplinas.flatMap((disc) => (disc?.topicos || []));
  if (topicos.length === 0) return true;
  const subtopicos = topicos.flatMap((topico) => (topico?.subtopicos || []));
  if (subtopicos.length > 0) return false;
  const meaningfulTopics = topicos.filter((topico) => !isGenericTopicName(topico?.nome));
  if (meaningfulTopics.length === 0) return true;
  return meaningfulTopics.length < Math.max(2, Math.ceil(disciplinas.length / 2));
}

function needsDisciplinaEnrichment(
  disciplinas: EditalDisciplina[],
  conteudoProgramatico: Record<string, any>
): boolean {
  if (!Array.isArray(disciplinas) || disciplinas.length === 0) return true;
  if (!conteudoProgramatico || Object.keys(conteudoProgramatico).length === 0) return true;
  return disciplinas.some((disc) => {
    const hasTopicos = Array.isArray(disc.topicos) && disc.topicos.length > 0;
    const hasQuestoes = typeof disc.numero_questoes === 'number' && disc.numero_questoes > 0;
    const hasPeso = typeof disc.peso === 'number' && disc.peso > 0;
    return !hasTopicos || !hasQuestoes || !hasPeso;
  });
}

function normalizeDisciplinaKey(value?: string): string {
  return normalizeSignalText(value || '');
}

function mergeDisciplinas(
  existing: EditalDisciplina[],
  extracted: EditalDisciplina[]
): { merged: EditalDisciplina[]; changed: boolean } {
  if (!Array.isArray(existing) || existing.length === 0) {
    return { merged: extracted, changed: extracted.length > 0 };
  }
  if (!Array.isArray(extracted) || extracted.length === 0) {
    return { merged: existing, changed: false };
  }

  const extractedByKey = new Map<string, EditalDisciplina>();
  for (const disc of extracted) {
    const key = normalizeDisciplinaKey(disc?.nome);
    if (key) extractedByKey.set(key, disc);
  }

  let changed = false;
  const merged = existing.map((disc) => {
    const key = normalizeDisciplinaKey(disc?.nome);
    const match = extractedByKey.get(key);
    if (!match) return disc;
    const updated: EditalDisciplina = { ...disc };

    if ((!disc.peso || disc.peso <= 0) && match.peso && match.peso > 0) {
      updated.peso = match.peso;
      changed = true;
    }
    if ((!disc.numero_questoes || disc.numero_questoes <= 0) && match.numero_questoes && match.numero_questoes > 0) {
      updated.numero_questoes = match.numero_questoes;
      changed = true;
    }
    if ((!disc.topicos || disc.topicos.length === 0) && match.topicos && match.topicos.length > 0) {
      updated.topicos = match.topicos;
      changed = true;
    }

    return updated;
  });

  const existingKeys = new Set(merged.map((disc) => normalizeDisciplinaKey(disc?.nome)).filter(Boolean));
  const additions = extracted.filter((disc) => {
    const key = normalizeDisciplinaKey(disc?.nome);
    return key && !existingKeys.has(key);
  });
  if (additions.length > 0) {
    merged.push(...additions);
    changed = true;
  }

  return { merged, changed };
}

function mergeConteudoProgramatico(
  existing: Record<string, any>,
  extracted: Record<string, any>
): { merged: Record<string, any>; changed: boolean } {
  if (!extracted || Object.keys(extracted).length === 0) {
    return { merged: existing, changed: false };
  }

  const merged = { ...(existing || {}) };
  let changed = false;
  for (const [key, value] of Object.entries(extracted)) {
    if (!merged[key] || (Array.isArray(merged[key]) && merged[key].length === 0)) {
      merged[key] = value;
      changed = true;
    }
  }

  return { merged, changed };
}

function needsCargoEnrichment(cargos: EditalCargo[]): boolean {
  if (!Array.isArray(cargos) || cargos.length === 0) return true;
  return cargos.some((cargo) => {
    const hasVagas = typeof cargo.vagas === 'number' && cargo.vagas > 0;
    const hasSalario = typeof cargo.salario === 'number' && cargo.salario > 0;
    const hasRequisitos = cargo.requisitos && cargo.requisitos.trim() !== '';
    return !hasVagas || (!hasSalario && !hasRequisitos);
  });
}

function normalizeCargoKey(value?: string): string {
  return normalizeSignalText(value || '');
}

function mergeCargos(
  existing: EditalCargo[],
  extracted: EditalCargo[]
): { merged: EditalCargo[]; changed: boolean } {
  if (!Array.isArray(existing) || existing.length === 0) {
    return { merged: extracted, changed: extracted.length > 0 };
  }
  if (!Array.isArray(extracted) || extracted.length === 0) {
    return { merged: existing, changed: false };
  }

  const extractedByKey = new Map<string, EditalCargo>();
  for (const cargo of extracted) {
    const key = normalizeCargoKey(cargo?.nome);
    if (key) extractedByKey.set(key, cargo);
  }

  let changed = false;
  const merged = existing.map((cargo) => {
    const key = normalizeCargoKey(cargo?.nome);
    const match = extractedByKey.get(key);
    if (!match) return cargo;
    const updated: EditalCargo = { ...cargo };

    if ((!cargo.vagas || cargo.vagas <= 0) && match.vagas && match.vagas > 0) {
      updated.vagas = match.vagas;
      changed = true;
    }
    if ((!cargo.vagas_ac || cargo.vagas_ac <= 0) && match.vagas_ac && match.vagas_ac > 0) {
      updated.vagas_ac = match.vagas_ac;
      changed = true;
    }
    if ((!cargo.vagas_pcd || cargo.vagas_pcd <= 0) && match.vagas_pcd && match.vagas_pcd > 0) {
      updated.vagas_pcd = match.vagas_pcd;
      changed = true;
    }
    if ((!cargo.salario || cargo.salario <= 0) && match.salario && match.salario > 0) {
      updated.salario = match.salario;
      changed = true;
    }
    if ((!cargo.requisitos || cargo.requisitos.trim() === '') && match.requisitos) {
      updated.requisitos = match.requisitos;
      changed = true;
    }
    if ((!cargo.carga_horaria || cargo.carga_horaria.trim() === '') && match.carga_horaria) {
      updated.carga_horaria = match.carga_horaria;
      changed = true;
    }
    if ((!cargo.descricao || cargo.descricao.trim() === '') && match.descricao) {
      updated.descricao = match.descricao;
      changed = true;
    }

    return updated;
  });

  const existingKeys = new Set(merged.map((cargo) => normalizeCargoKey(cargo?.nome)).filter(Boolean));
  const additions = extracted.filter((cargo) => {
    const key = normalizeCargoKey(cargo?.nome);
    return key && !existingKeys.has(key);
  });
  if (additions.length > 0) {
    merged.push(...additions);
    changed = true;
  }

  return { merged, changed };
}

function countWordMatches(text: string, words: string[]): number {
  return words.reduce((sum, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    return sum + (text.match(regex) || []).length;
  }, 0);
}

function isLowSignalText(text: string): boolean {
  if (!text) return true;
  const normalized = normalizeSignalText(text);
  const signalHits = SIGNAL_WORDS.filter((word) => normalized.includes(word)).length;
  const commonHits = countWordMatches(normalized, COMMON_WORDS);
  if (signalHits >= 2 || commonHits >= 6) return false;
  return true;
}

async function extractTextViaPdftotext(buffer: Buffer): Promise<string | null> {
  try {
    return await withTempDir('md-pdftotext-', async (dir) => {
      const inputPath = path.join(dir, 'input.pdf');
      const outputPath = path.join(dir, 'output.txt');
      await fs.promises.writeFile(inputPath, buffer);
      await execFileAsync(
        'pdftotext',
        ['-layout', inputPath, outputPath],
        { timeout: PDF_TEXT_TIMEOUT_MS }
      );
      const text = await fs.promises.readFile(outputPath, 'utf8');
      return text.trim();
    });
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      console.warn('[harvest] pdftotext nao encontrado');
    } else {
      console.warn('[harvest] Falha ao extrair texto via pdftotext', err);
    }
    return null;
  }
}

async function extractTextViaOcr(buffer: Buffer): Promise<string | null> {
  if (PDF_OCR_MAX_PAGES <= 0) return null;

  try {
    return await withTempDir('md-ocr-', async (dir) => {
      const inputPath = path.join(dir, 'input.pdf');
      const prefix = path.join(dir, 'page');
      await fs.promises.writeFile(inputPath, buffer);
      await execFileAsync(
        'pdftoppm',
        ['-png', '-f', '1', '-l', String(PDF_OCR_MAX_PAGES), inputPath, prefix],
        { timeout: PDF_OCR_TIMEOUT_MS }
      );

      const files = (await fs.promises.readdir(dir))
        .filter((file) => file.startsWith('page-') && file.endsWith('.png'))
        .sort();

      if (!files.length) return null;

      const languageCandidates = uniqueStrings([OCR_LANGS, 'por+eng', 'eng']);
      let lastError: any = null;

      for (const lang of languageCandidates) {
        try {
          let combined = '';
          const safeLang = lang.replace(/[^a-z0-9]+/gi, '_');
          for (const [idx, file] of files.entries()) {
            const imagePath = path.join(dir, file);
            const outputBase = path.join(dir, `ocr-${safeLang}-${idx + 1}`);
            await execFileAsync(
              'tesseract',
              [imagePath, outputBase, '-l', lang, '--psm', '6'],
              { timeout: OCR_PAGE_TIMEOUT_MS }
            );
            const pageText = await fs.promises.readFile(`${outputBase}.txt`, 'utf8');
            combined += `${pageText}\n\n`;
          }

          if (combined.trim()) {
            return combined.trim();
          }
        } catch (err: any) {
          lastError = err;
          if (isTesseractMissingLanguage(err)) {
            console.warn(`[harvest] OCR sem lang ${lang}, tentando fallback`);
            continue;
          }
          throw err;
        }
      }

      if (lastError?.code === 'ENOENT') {
        console.warn('[harvest] OCR tools nao encontrados');
      } else if (lastError) {
        console.warn('[harvest] Falha ao extrair texto via OCR', lastError);
      }
      return null;
    });
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      console.warn('[harvest] OCR tools nao encontrados');
    } else {
      console.warn('[harvest] Falha ao extrair texto via OCR', err);
    }
    return null;
  }
}

type OcrTsvWord = {
  page: number;
  block: number;
  par: number;
  line: number;
  left: number;
  top: number;
  width: number;
  text: string;
  conf: number;
};

function parseOcrTsv(tsv: string): OcrTsvWord[] {
  if (!tsv) return [];
  const lines = tsv.split(/\r?\n/);
  const words: OcrTsvWord[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const parts = line.split('\t');
    if (parts.length < 12) continue;
    const level = Number(parts[0]);
    if (level !== 5) continue; // palavra
    const conf = Number(parts[10]);
    const text = (parts[11] || '').trim();
    if (!text) continue;
    if (Number.isFinite(conf) && conf >= 0 && conf < 40) continue;
    words.push({
      page: Number(parts[1]) || 0,
      block: Number(parts[2]) || 0,
      par: Number(parts[3]) || 0,
      line: Number(parts[4]) || 0,
      left: Number(parts[6]) || 0,
      top: Number(parts[7]) || 0,
      width: Number(parts[8]) || 0,
      text,
      conf: Number.isFinite(conf) ? conf : 0,
    });
  }
  return words;
}

function ocrWordsToLines(words: OcrTsvWord[]): string[] {
  const grouped = new Map<string, OcrTsvWord[]>();
  for (const word of words) {
    const key = `${word.page}-${word.block}-${word.par}-${word.line}`;
    const bucket = grouped.get(key) || [];
    bucket.push(word);
    grouped.set(key, bucket);
  }

  const lines: { top: number; text: string }[] = [];
  grouped.forEach((bucket) => {
    const ordered = bucket.sort((a, b) => a.left - b.left);
    let lineText = '';
    let lastEnd = 0;
    for (const word of ordered) {
      const gap = word.left - lastEnd;
      if (lineText.length > 0) {
        lineText += gap > 25 ? '  ' : ' ';
      }
      lineText += word.text;
      lastEnd = word.left + word.width;
    }
    if (lineText.trim().length > 0) {
      lines.push({ top: ordered[0]?.top ?? 0, text: lineText.trim() });
    }
  });

  return lines.sort((a, b) => a.top - b.top).map((line) => line.text);
}

async function extractOcrTsv(buffer: Buffer): Promise<string | null> {
  if (PDF_OCR_MAX_PAGES <= 0) return null;

  try {
    return await withTempDir('md-ocr-tsv-', async (dir) => {
      const inputPath = path.join(dir, 'input.pdf');
      const prefix = path.join(dir, 'page');
      await fs.promises.writeFile(inputPath, buffer);
      await execFileAsync(
        'pdftoppm',
        ['-png', '-f', '1', '-l', String(PDF_OCR_MAX_PAGES), inputPath, prefix],
        { timeout: PDF_OCR_TIMEOUT_MS }
      );

      const files = (await fs.promises.readdir(dir))
        .filter((file) => file.startsWith('page-') && file.endsWith('.png'))
        .sort();

      if (!files.length) return null;

      const languageCandidates = uniqueStrings([OCR_LANGS, 'por+eng', 'eng']);
      let combinedTsv = '';
      for (const [idx, file] of files.entries()) {
        let lastError: any = null;
        for (const lang of languageCandidates) {
          try {
            const imagePath = path.join(dir, file);
            const outputBase = path.join(dir, `ocr-tsv-${idx + 1}`);
            await execFileAsync(
              'tesseract',
              [imagePath, outputBase, '-l', lang, '--psm', '6', 'tsv'],
              { timeout: OCR_PAGE_TIMEOUT_MS }
            );
            const tsvPath = `${outputBase}.tsv`;
            const tsv = await fs.promises.readFile(tsvPath, 'utf8');
            combinedTsv += `${tsv}\n`;
            lastError = null;
            break;
          } catch (err: any) {
            lastError = err;
            if (isTesseractMissingLanguage(err)) {
              continue;
            }
          }
        }
        if (lastError) {
          console.warn('[harvest] Falha ao gerar TSV OCR', lastError);
        }
      }

      return combinedTsv.trim() || null;
    });
  } catch (err) {
    console.warn('[harvest] Falha ao extrair TSV OCR', err);
    return null;
  }
}

async function extractExamMatrixRowsFromOcr(
  buffer: Buffer
): Promise<{ rows: ExamMatrixRow[]; text: string }> {
  const tsv = await extractOcrTsv(buffer);
  if (!tsv) return { rows: [], text: '' };
  const words = parseOcrTsv(tsv);
  const lines = ocrWordsToLines(words);
  const text = lines.join('\n');
  const scopedText = extractExamMatrixSection(text);
  const rows = extractExamMatrixRows(scopedText || '');
  return { rows, text: scopedText || text };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function fetchBufferWithTimeout(url: string, timeoutMs: number, maxBytes: number): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const contentLength = Number(res.headers.get('content-length') || 0);
    if (maxBytes > 0 && contentLength && contentLength > maxBytes) {
      throw new Error(`PDF maior que limite (${contentLength} > ${maxBytes})`);
    }

    const arrayBuffer = await res.arrayBuffer();
    if (maxBytes > 0 && arrayBuffer.byteLength > maxBytes) {
      throw new Error(`PDF maior que limite (${arrayBuffer.byteLength} > ${maxBytes})`);
    }

    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
}

function isPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString('utf8') === '%PDF-';
}

function createCodigoFromUrl(url?: string, source?: string): string | undefined {
  if (!url) return undefined;
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
  const prefix = (source || 'edital').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 6) || 'edital';
  return `${prefix}-${hash}`;
}

function parseCurrency(value: string): number | undefined {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOptionalNumber(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  const normalized = String(value).replace(',', '.').replace(/[^\d.]/g, '');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalCurrency(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  const parsed = parseCurrency(String(value));
  if (parsed !== undefined) return parsed;
  return parseOptionalNumber(value);
}

function resolveNumeroVagas(
  metaValue: any,
  extractedValue?: number,
  cargoTotal?: number
): number {
  const metaParsed = parseOptionalNumber(metaValue);
  if (metaParsed && metaParsed > 0) return metaParsed;
  if (cargoTotal && cargoTotal > 0) return cargoTotal;
  if (extractedValue && extractedValue > 0) return extractedValue;
  return 0;
}

type ExamMatrixRow = {
  disciplina: string;
  numero_questoes?: number;
  peso?: number;
};

function extractExamMatrixRows(text: string): ExamMatrixRow[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const normalizedLines = lines.map((line) => normalizeSignalText(line));
  const rows: ExamMatrixRow[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const headerLine = normalizedLines[i] || '';
    const headerWindow = `${headerLine} ${normalizedLines[i + 1] || ''}`;
    const hasDisciplinaColumn =
      headerWindow.includes('disciplina') ||
      headerWindow.includes('materia') ||
      headerWindow.includes('materias') ||
      headerWindow.includes('conteudo') ||
      headerWindow.includes('conteudos') ||
      headerWindow.includes('assunto');
    if (!hasDisciplinaColumn) continue;
    const hasQuestoesColumn =
      headerWindow.includes('quest') ||
      headerWindow.includes('itens') ||
      headerWindow.includes('qtd') ||
      headerWindow.includes('quant');
    if (!hasQuestoesColumn) continue;

    let headerRaw = (lines[i] || '').trim();
    let headerCols = headerRaw.split(/\s{2,}/).filter(Boolean);
    if (headerCols.length < 2 && i + 1 < lines.length) {
      headerRaw = `${lines[i] || ''} ${lines[i + 1] || ''}`.trim();
      headerCols = headerRaw.split(/\s{2,}/).filter(Boolean);
    }

    const normalizedCols = headerCols.map(normalizeSignalText);
    const discIndex = normalizedCols.findIndex(
      (col) =>
        col.includes('disciplina') ||
        col.includes('materia') ||
        col.includes('materias') ||
        col.includes('conteudo') ||
        col.includes('conteudos') ||
        col.includes('assunto')
    );
    const questIndex = normalizedCols.findIndex(
      (col) => col.includes('quest') || col.includes('itens') || col.includes('qtd') || col.includes('quant')
    );
    const pesoIndex = normalizedCols.findIndex((col) => col.includes('peso'));
    if (discIndex < 0) continue;

    for (let j = i + 1; j < lines.length; j += 1) {
      const rawLine = lines[j] || '';
      const line = rawLine.trim();
      if (!line) {
        if (rows.length > 0) break;
        continue;
      }
      const normalized = normalizedLines[j] || '';
      if (normalized.includes('disciplina') && j !== i) break;
      if (normalized.startsWith('total')) continue;
      if (normalized.includes('total de pontos')) continue;
      const collapsed = line.replace(/\s+/g, '');
      if (/^[-=]{3,}$/.test(collapsed)) continue;

      const cols = rawLine.trim().split(/\s{2,}/).filter(Boolean);
      if (cols.length < 2) continue;

      const disciplina = cols[discIndex] || cols[0] || '';
      if (!disciplina) continue;
      const numero = questIndex >= 0 ? parseOptionalNumber(cols[questIndex]) : undefined;
      const peso = pesoIndex >= 0 ? parseOptionalNumber(cols[pesoIndex]) : undefined;
      if (!numero && !peso) continue;

      rows.push({
        disciplina: disciplina.trim(),
        numero_questoes: numero,
        peso,
      });
    }

    if (rows.length > 0) break;
  }

  return rows;
}

function isValidExamMatrixRow(row: ExamMatrixRow): boolean {
  if (!row || !row.disciplina) return false;
  const disciplina = normalizeAiLabel(row.disciplina);
  if (!disciplina) return false;
  const normalized = normalizeSignalText(disciplina);
  if (!normalized || normalized.startsWith('total')) return false;
  if (isDisallowedSyllabusItem(disciplina) || isGenericDisciplinaName(disciplina)) return false;
  return row.numero_questoes !== undefined || row.peso !== undefined;
}

function filterExamMatrixRows(rows: ExamMatrixRow[]): ExamMatrixRow[] {
  return (rows || [])
    .filter((row) => isValidExamMatrixRow(row))
    .map((row) => ({
      disciplina: normalizeAiLabel(row.disciplina),
      numero_questoes: row.numero_questoes,
      peso: row.peso,
    }));
}

function countExamMatrixRowsWithNumbers(rows: ExamMatrixRow[]): number {
  return (rows || []).filter((row) => {
    const numero = parseOptionalNumber(row.numero_questoes);
    const peso = parseOptionalNumber(row.peso);
    return (numero !== undefined && numero > 0) || (peso !== undefined && peso > 0);
  }).length;
}

function pickBestExamMatrixRows(primary: ExamMatrixRow[], secondary: ExamMatrixRow[]): ExamMatrixRow[] {
  const primaryScore = countExamMatrixRowsWithNumbers(primary);
  const secondaryScore = countExamMatrixRowsWithNumbers(secondary);
  if (secondaryScore > primaryScore) return secondary;
  if (secondaryScore === primaryScore && secondary.length > primary.length) return secondary;
  return primary;
}

async function extractExamMatrixRowsWithAi(
  text: string,
  titulo: string,
  banca?: string
): Promise<ExamMatrixRow[]> {
  if (!process.env.OPENAI_API_KEY || !text) return [];
  const basePayload = {
    concurso: titulo || banca || 'Concurso',
  };
  try {
    const aiResult = await withTimeout(
      extractExamMatrixStructure({
        editalText: compactTextForAi(text),
        ...basePayload,
      }),
      AI_EXTRACTION_TIMEOUT_MS,
      'extractExamMatrixStructure'
    );

    const rows = (aiResult?.linhas || [])
      .map((row: any) => ({
        disciplina: normalizeAiLabel(row?.disciplina ?? row?.nome ?? row),
        numero_questoes: parseOptionalNumber(row?.numero_questoes ?? row?.questoes ?? row?.qtd),
        peso: parseOptionalNumber(row?.peso ?? row?.pontuacao ?? row?.valor),
      }))
      .filter((row: ExamMatrixRow) => isValidExamMatrixRow(row));

    return rows;
  } catch (err) {
    console.warn('[harvest] Falha ao extrair matriz de provas com IA:', err);
    return [];
  }
}

function extractCargoRows(text: string): EditalCargo[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const normalizedLines = lines.map((line) => normalizeSignalText(line));
  const cargos: EditalCargo[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const headerLine = normalizedLines[i] || '';
    if (!headerLine.includes('cargo')) continue;
    if (!headerLine.includes('vaga')) continue;

    let headerRaw = (lines[i] || '').trim();
    let headerCols = headerRaw.split(/\s{2,}/).filter(Boolean);
    if (headerCols.length < 2 && i + 1 < lines.length) {
      headerRaw = `${lines[i] || ''} ${lines[i + 1] || ''}`.trim();
      headerCols = headerRaw.split(/\s{2,}/).filter(Boolean);
    }

    const normalizedCols = headerCols.map(normalizeSignalText);
    const cargoIndex = normalizedCols.findIndex((col) => col.includes('cargo'));
    if (cargoIndex < 0) continue;

    const totalVagasIndex = normalizedCols.findIndex(
      (col) => col.includes('total') && col.includes('vagas')
    );
    const vagasIndex = totalVagasIndex >= 0
      ? totalVagasIndex
      : normalizedCols.findIndex(
          (col) =>
            col.includes('vagas') &&
            !col.includes('pcd') &&
            !col.includes('ac') &&
            !col.includes('pn') &&
            !col.includes('ind')
        );
    const vagasAcIndex = normalizedCols.findIndex((col) => col.includes('ac'));
    const vagasPcdIndex = normalizedCols.findIndex((col) => col.includes('pcd') || col.includes('defici'));
    const vagasPnIndex = normalizedCols.findIndex((col) => col.includes('pn') || col.includes('negra'));
    const vagasIndIndex = normalizedCols.findIndex((col) => col.includes('ind'));
    const salarioIndex = normalizedCols.findIndex(
      (col) => col.includes('vencimento') || col.includes('salario') || col.includes('remuneracao')
    );
    const requisitosIndex = normalizedCols.findIndex(
      (col) => col.includes('requisito') || col.includes('escolaridade')
    );
    const cargaHorariaIndex = normalizedCols.findIndex(
      (col) => col.includes('carga horaria') || col === 'ch' || col.includes('horaria')
    );

    for (let j = i + 1; j < lines.length; j += 1) {
      const rawLine = lines[j] || '';
      const line = rawLine.trim();
      if (!line) {
        if (cargos.length > 0) break;
        continue;
      }
      const normalized = normalizedLines[j] || '';
      if (normalized.includes('cargo') && j !== i) break;
      if (normalized.startsWith('nivel')) continue;
      if (normalized.startsWith('total')) continue;

      const cols = rawLine.trim().split(/\s{2,}/).filter(Boolean);
      if (cols.length <= cargoIndex) continue;
      const nome = cols[cargoIndex]?.trim();
      if (!nome) continue;

      const vagas = vagasIndex >= 0 ? parseOptionalNumber(cols[vagasIndex]) : undefined;
      const vagasAc = vagasAcIndex >= 0 ? parseOptionalNumber(cols[vagasAcIndex]) : undefined;
      const vagasPcd = vagasPcdIndex >= 0 ? parseOptionalNumber(cols[vagasPcdIndex]) : undefined;
      const vagasPn = vagasPnIndex >= 0 ? parseOptionalNumber(cols[vagasPnIndex]) : undefined;
      const vagasInd = vagasIndIndex >= 0 ? parseOptionalNumber(cols[vagasIndIndex]) : undefined;

      let totalVagas = vagas;
      if (!totalVagas) {
        const computed = [vagasAc, vagasPcd, vagasPn, vagasInd].reduce((sum, value) => sum + (value || 0), 0);
        totalVagas = computed > 0 ? computed : undefined;
      }

      const salario = salarioIndex >= 0 ? parseOptionalCurrency(cols[salarioIndex]) : undefined;
      const requisitos = requisitosIndex >= 0 ? cols[requisitosIndex] : undefined;
      const cargaHoraria = cargaHorariaIndex >= 0 ? cols[cargaHorariaIndex] : undefined;

      const descricaoParts: string[] = [];
      if (vagasPn) descricaoParts.push(`Vagas PN: ${vagasPn}`);
      if (vagasInd) descricaoParts.push(`Vagas IND: ${vagasInd}`);

      cargos.push({
        nome,
        vagas: totalVagas ?? 0,
        vagas_ac: vagasAc,
        vagas_pcd: vagasPcd,
        salario,
        requisitos,
        carga_horaria: cargaHoraria,
        descricao: descricaoParts.length ? descricaoParts.join(' | ') : undefined,
      });
    }

    if (cargos.length > 0) break;
  }

  return cargos;
}

function extractNumeroVagas(text: string): number | undefined {
  if (!text) return undefined;
  const normalized = normalizeSignalText(text);
  const regex = /(\d{1,6}(?:\.\d{3})*)\s+vagas?\b/gi;
  const candidates: Array<{ value: number; score: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    const value = parseInt(match[1].replace(/\./g, ''), 10);
    if (!Number.isFinite(value) || value <= 0) continue;
    const idx = match.index ?? 0;
    const window = normalized.slice(Math.max(0, idx - 80), idx + 160);
    let score = 1;

    if (/total\s+de\s+vagas/.test(window)) score += 5;
    if (/vagas\s+oferecidas/.test(window)) score += 4;
    if (/vagas\s+disponiveis/.test(window)) score += 4;
    if (/vagas\s+imediatas/.test(window)) score += 3;
    if (/numero\s+de\s+vagas/.test(window)) score += 3;
    if (/quantidade\s+de\s+vagas/.test(window)) score += 3;
    if (/vagas\s+para\s+provimento/.test(window)) score += 2;

    if (/cadastro\s+reserva/.test(window)) score -= 2;
    if (/taxa\s+de\s+inscri/.test(window)) score -= 3;
    if (/salario|vencimento|remuneracao/.test(window)) score -= 3;

    if (value > 5000) score -= 2;
    if (value > 20000) score -= 4;

    candidates.push({ value, score });
  }

  if (!candidates.length) return undefined;
  candidates.sort((a, b) => b.score - a.score || a.value - b.value);
  const best = candidates[0];
  return best.score > 0 ? best.value : undefined;
}

function extractTaxaInscricao(text: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(/taxa[^0-9]{0,20}R\$\s*([0-9.\s]+,[0-9]{2})/i);
  if (!match) return undefined;
  return parseCurrency(match[1]);
}

function isLowDetailCargoExtraction(aiResult: { cargos?: any[] }): boolean {
  const cargos = Array.isArray(aiResult?.cargos) ? aiResult.cargos : [];
  if (cargos.length === 0) return true;
  const meaningful = cargos.filter((cargo) => !isGenericCargoName(normalizeAiLabel(cargo?.nome ?? cargo)));
  return meaningful.length === 0;
}

async function extractCargosFromText(
  text: string,
  titulo: string,
  banca?: string,
  fallbackText?: string
): Promise<EditalCargo[]> {
  if (!process.env.OPENAI_API_KEY || !text) {
    return [];
  }

  try {
    const basePayload = {
      concurso: titulo || banca || 'Concurso',
    };

    const aiResult = await withTimeout(
      extractCargoStructure({
        editalText: compactTextForAi(text),
        ...basePayload,
      }),
      AI_EXTRACTION_TIMEOUT_MS,
      'extractCargoStructure'
    );

    let finalResult = aiResult;
    if (fallbackText && fallbackText !== text && isLowDetailCargoExtraction(aiResult)) {
      const fallbackResult = await withTimeout(
        extractCargoStructure({
          editalText: compactTextForAi(fallbackText),
          ...basePayload,
        }),
        AI_EXTRACTION_TIMEOUT_MS,
        'extractCargoStructure'
      );
      if (!isLowDetailCargoExtraction(fallbackResult)) {
        finalResult = fallbackResult;
      }
    }

    const cargos = (finalResult.cargos || [])
      .map((cargo: any) => {
        const nome = normalizeAiLabel(cargo?.nome ?? cargo);
        if (!nome || isGenericCargoName(nome)) return null;
        return {
          nome,
          vagas: parseOptionalNumber(cargo?.vagas) ?? 0,
          vagas_ac: parseOptionalNumber(cargo?.vagas_ac),
          vagas_pcd: parseOptionalNumber(cargo?.vagas_pcd),
          salario: parseOptionalCurrency(cargo?.salario),
          requisitos: cargo?.requisitos ? String(cargo.requisitos).trim() : undefined,
          carga_horaria: cargo?.carga_horaria ? String(cargo.carga_horaria).trim() : undefined,
          descricao: cargo?.descricao ? String(cargo.descricao).trim() : undefined,
        } as EditalCargo;
      })
      .filter(Boolean) as EditalCargo[];

    return cargos;
  } catch (err) {
    console.warn('[harvest] Falha ao extrair cargos com IA:', err);
    return [];
  }
}

async function extractDisciplinasFromText(
  text: string,
  titulo: string,
  banca?: string,
  fallbackText?: string
): Promise<{ disciplinas: EditalDisciplina[]; conteudo_programatico: Record<string, any> }> {
  if (!process.env.OPENAI_API_KEY || !text) {
    return { disciplinas: [], conteudo_programatico: {} };
  }

  try {
    const basePayload = {
      concurso: titulo || banca || 'Concurso',
    };

    let aiResult = await withTimeout(
      extractBlueprintStructure({
        editalText: compactTextForAi(text),
        ...basePayload,
      }),
      AI_EXTRACTION_TIMEOUT_MS,
      'extractBlueprintStructure'
    );

    let finalResult = aiResult;
    if (fallbackText && fallbackText !== text && isLowDetailExtraction(aiResult)) {
      const fallbackResult = await withTimeout(
        extractBlueprintStructure({
          editalText: compactTextForAi(fallbackText),
          ...basePayload,
        }),
        AI_EXTRACTION_TIMEOUT_MS,
        'extractBlueprintStructure'
      );
      if (!isLowDetailExtraction(fallbackResult)) {
        finalResult = fallbackResult;
      }
    }

    const aiDisciplinas = normalizeAiDisciplinas(finalResult.disciplinas || []);
    const disciplinas: EditalDisciplina[] = aiDisciplinas.map((disc) => {
      const rawTopicos = (disc.topicos || [])
        .map((topico) => topico.nome)
        .filter((nome) => nome && !isDisallowedSyllabusItem(nome));
      const filteredTopicos = rawTopicos.filter((nome) => !isGenericTopicName(nome));
      const topicos = filteredTopicos.length ? filteredTopicos : rawTopicos;

      return {
        nome: disc.nome,
        peso: parseOptionalNumber(disc.peso),
        numero_questoes: parseOptionalNumber(disc.numero_questoes),
        topicos,
      };
    });

    const conteudo_programatico = aiDisciplinas.reduce<Record<string, any>>((acc, disc) => {
      if (isDisallowedSyllabusItem(disc.nome)) return acc;
      const rawTopicos = (disc.topicos || [])
        .filter((topico) => !isDisallowedSyllabusItem(topico?.nome))
        .map((topico) => ({
          nome: topico.nome,
          subtopicos: (topico.subtopicos || []).filter((sub) => !isDisallowedSyllabusItem(sub)),
        }));
      const filteredTopicos = rawTopicos.filter((topico) => !isGenericTopicName(topico?.nome));
      acc[disc.nome] = filteredTopicos.length ? filteredTopicos : rawTopicos;
      return acc;
    }, {});

    const filteredDisciplinas = disciplinas.filter((disc) => !isDisallowedSyllabusItem(disc.nome));

    return { disciplinas: filteredDisciplinas, conteudo_programatico };
  } catch (err) {
    console.warn('[harvest] Falha ao extrair disciplinas com IA:', err);
    return { disciplinas: [], conteudo_programatico: {} };
  }
}

function normalizeDateToken(dateStr: string): string | undefined {
  const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
  if (parts.length !== 3) return undefined;
  let [p1, p2, p3] = parts.map((p) => parseInt(p, 10));
  // Assume dd/mm/yyyy
  let day = p1;
  let month = p2;
  let year = p3;
  if (year < 100) year += 2000;
  if (month > 12 && day <= 12) {
    // swap if format looks like mm/dd/yyyy
    const tmp = day;
    day = month;
    month = tmp;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

function parseTextDateToken(day: string, monthLabel: string, year: string): string | undefined {
  const parsedDay = parseInt(day, 10);
  const parsedMonth = MONTHS[monthLabel] || 0;
  const parsedYear = parseInt(year, 10);
  if (!parsedDay || !parsedMonth || !parsedYear) return undefined;
  return new Date(Date.UTC(parsedYear, parsedMonth - 1, parsedDay)).toISOString();
}

function classifyCronogramaLine(normalized: string): { tipo: EventoTipo; titulo: string } | null {
  if (normalized.includes('inscric') || normalized.includes('matricula') || normalized.includes('isencao')) {
    return { tipo: 'inscricao', titulo: 'Inscricoes' };
  }
  if (normalized.includes('prova') || normalized.includes('aplicacao') || normalized.includes('avaliacao')) {
    return { tipo: 'prova', titulo: 'Prova' };
  }
  if (normalized.includes('resultado') || normalized.includes('classifica') || normalized.includes('gabarito')) {
    return { tipo: 'resultado', titulo: 'Resultado' };
  }
  if (normalized.includes('recurso')) {
    return { tipo: 'recurso', titulo: 'Recurso' };
  }
  if (normalized.includes('convoca') || normalized.includes('homolog') || normalized.includes('nomeacao') || normalized.includes('posse')) {
    return { tipo: 'convocacao', titulo: 'Convocacao' };
  }
  if (normalized.includes('cronograma')) {
    return { tipo: 'outro', titulo: 'Cronograma' };
  }
  return null;
}

function extractCronogramaEvents(text: string): CronogramaEvent[] {
  if (!text) return [];
  const events: CronogramaEvent[] = [];
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (line.includes('@context') || line.includes('@graph') || line.includes('schema.org')) {
      continue;
    }
    const trimmed = line.trim();
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.includes('"@')) {
      continue;
    }
    const normalized = normalizeSignalText(line);
    const classification = classifyCronogramaLine(normalized);
    if (!classification) continue;

    const rangeMatch = line.match(
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:a|ate)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    );
    let dataInicio: string | undefined;
    let dataFim: string | undefined;

    if (rangeMatch) {
      dataInicio = normalizeDateToken(rangeMatch[1]);
      dataFim = normalizeDateToken(rangeMatch[2]);
    } else {
      const numericMatch = line.match(DATE_REGEX);
      if (numericMatch && numericMatch[0]) {
        dataInicio = normalizeDateToken(numericMatch[0]);
      } else {
        const textMatch = line.match(TEXT_DATE_REGEX);
        if (textMatch && textMatch[1] && textMatch[2] && textMatch[3]) {
          dataInicio = parseTextDateToken(textMatch[1], textMatch[2].toLowerCase(), textMatch[3]);
        }
      }
    }

    if (!dataInicio && !dataFim) continue;
    events.push({
      tipo: classification.tipo,
      titulo: classification.titulo,
      data_inicio: dataInicio,
      data_fim: dataFim,
      descricao: line.length > 220 ? line.slice(0, 220) : line,
    });
  }

  return events;
}

function extractDatesFromText(text: string): ParsedDates {
  const lowered = text.toLowerCase();
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const nowYear = new Date().getUTCFullYear();
  const matches = Array.from(text.matchAll(DATE_REGEX)).map((m) => ({
    raw: m[1],
    index: m.index ?? 0,
    iso: normalizeDateToken(m[1]),
  })).filter((m) => {
    if (!m.iso) return false;
    const year = new Date(m.iso).getUTCFullYear();
    return year >= nowYear - 2 && year <= nowYear + 4;
  });

  const textMatches = Array.from(normalized.matchAll(TEXT_DATE_REGEX)).map((m) => {
    const day = parseInt(m[1], 10);
    const month = MONTHS[m[2]] || 0;
    const year = parseInt(m[3], 10);
    if (!day || !month || !year) return null;
    const iso = new Date(Date.UTC(year, month - 1, day)).toISOString();
    return { raw: m[0], index: m.index ?? 0, iso };
  }).filter((m): m is { raw: string; index: number; iso: string } => Boolean(m));

  const allMatches = [...matches, ...textMatches].filter((m) => {
    const year = new Date(m.iso).getUTCFullYear();
    return year >= nowYear - 2 && year <= nowYear + 4;
  });

  const windows = allMatches.map((m) => {
    const start = Math.max(0, m.index - 60);
    const end = Math.min(text.length, m.index + 60);
    return { ...m, window: lowered.slice(start, end) };
  });

  const parsed: ParsedDates = {};
  const checkAndSet = (field: keyof ParsedDates, predicate: (w: string) => boolean) => {
    if (parsed[field]) return;
    const candidate = windows.find((w) => predicate(w.window));
    if (candidate) parsed[field] = candidate.iso;
  };

  checkAndSet('publication', (w) => w.includes('publica') || w.includes('edital') || w.includes('divulga'));
  checkAndSet('inscricaoInicio', (w) => w.includes('início') || w.includes('inicio') || w.includes('abertura') || w.includes('inscri'));
  checkAndSet('inscricaoFim', (w) => w.includes('fim') || w.includes('encerra') || w.includes('prazo') || w.includes('termino'));
  checkAndSet('provaPrevista', (w) => w.includes('prova') || w.includes('aplica'));

  // Fallback: preencher sequencialmente se ainda estiver faltando
  const remaining = windows.map((w) => w.iso).filter(Boolean) as string[];
  const setIfEmpty = (field: keyof ParsedDates, value?: string) => {
    if (!parsed[field] && value) parsed[field] = value;
  };
  setIfEmpty('publication', remaining[0]);
  setIfEmpty('inscricaoInicio', remaining[1]);
  setIfEmpty('inscricaoFim', remaining[2]);
  setIfEmpty('provaPrevista', remaining[3]);

  return parsed;
}

async function syncCronogramaEvents(
  editalId: string,
  text: string,
  dates: ParsedDates,
  link?: string
): Promise<number> {
  if (!editalId) return 0;
  const hasText = Boolean(text && text.trim().length > 0);
  const { editalRepository } = await import('../repositories/editalRepository');
  const existing = await editalRepository.findEventosByEditalId(editalId);
  const existingKeys = new Set(
    existing.map((evento) => `${evento.tipo}|${evento.data_inicio || ''}|${evento.data_fim || ''}`)
  );

  const extracted = hasText ? extractCronogramaEvents(text) : [];
  const seeded: CronogramaEvent[] = [];
  if (dates.publication) {
    seeded.push({
      tipo: 'outro',
      titulo: 'Publicacao do edital',
      data_inicio: dates.publication,
    });
  }
  if (dates.inscricaoInicio || dates.inscricaoFim) {
    seeded.push({
      tipo: 'inscricao',
      titulo: 'Inscricoes',
      data_inicio: dates.inscricaoInicio,
      data_fim: dates.inscricaoFim,
    });
  }
  if (dates.provaPrevista) {
    seeded.push({
      tipo: 'prova',
      titulo: 'Prova',
      data_inicio: dates.provaPrevista,
    });
  }

  const candidates = [...seeded, ...extracted];
  if (!candidates.length) return 0;

  let created = 0;
  for (const evento of candidates) {
    const key = `${evento.tipo}|${evento.data_inicio || ''}|${evento.data_fim || ''}`;
    if (existingKeys.has(key)) continue;
    await editalRepository.createEvento({
      edital_id: editalId,
      tipo: evento.tipo,
      titulo: evento.titulo,
      descricao: evento.descricao,
      data_inicio: evento.data_inicio,
      data_fim: evento.data_fim,
      link_externo: link,
    });
    created += 1;
  }

  return created;
}

type BancaPreset = {
  slug: string;
  name: string;
  base_url: string;
  priority?: number;
  config?: HarvestSourceConfig;
};

type CronogramaEvent = {
  tipo: EventoTipo;
  titulo: string;
  data_inicio?: string;
  data_fim?: string;
  descricao?: string;
};

const DEFAULT_EDITAL_FILTERS: HarvestSourceConfig = {
  textIncludePatterns: ['edital', 'edital de abertura', 'concurso', 'processo seletivo'],
  textExcludePatterns: ['resultado', 'gabarito', 'retifica', 'retificacao', 'convoca', 'convocacao', 'homologa', 'classifica', 'recurso', 'anexo'],
  urlExcludePatterns: ['resultado', 'gabarito', 'retificacao', 'convocacao', 'classificacao', 'recurso'],
  urlIncludePatterns: ['edital', 'concurso', 'pdf'],
};

const BANCA_PRESETS: BancaPreset[] = [
  {
    slug: 'pci',
    name: 'PCI Concursos',
    base_url: 'https://www.pciconcursos.com.br/noticias/',
    priority: 7,
    config: {
      allowedDomains: ['pciconcursos.com.br'],
      linkPatterns: ['noticias/.+'],
      seed_urls: ['https://www.pciconcursos.com.br/noticias/'],
      urlIncludePatterns: ['noticias'],
      urlExcludePatterns: ['noticias/?$', 'noticias\\?'],
    },
  },
    {
      slug: 'jcconcursos',
      name: 'JC Concursos',
      base_url: 'https://jcconcursos.com.br/concursos/inscricoes-abertas',
      priority: 8,
      config: {
        allowedDomains: ['jcconcursos.com.br'],
        seed_urls: [
          'https://jcconcursos.com.br/concursos/inscricoes-abertas',
          'https://jcconcursos.com.br/concursos/em-andamento',
          'https://jcconcursos.com.br/concursos/previstos',
          'https://jcconcursos.com.br/concursos/autorizados',
        ],
        linkPatterns: ['\\/concurso\\/'],
        urlIncludePatterns: ['jcconcursos.com.br/concurso/'],
        textIncludePatterns: ['.*'],
      },
    },
    {
      slug: 'granblog',
      name: 'Gran Cursos Blog',
      base_url: 'https://blog.grancursosonline.com.br',
      priority: 6,
      config: {
        allowedDomains: ['blog.grancursosonline.com.br', 'grancursosonline.com.br'],
        seed_urls: ['https://blog.grancursosonline.com.br/'],
        linkPatterns: ['blog\\.grancursosonline\\.com\\.br'],
        urlIncludePatterns: ['blog.grancursosonline.com.br/'],
        urlExcludePatterns: ['/tag/', '/categoria/', '/category/', '/autor/', '/author/', '/page/', '/amp/'],
        textIncludePatterns: ['.*'],
      },
    },
  {
    slug: 'cebraspe',
    name: 'Cebraspe Concursos',
    base_url: 'https://www.cebraspe.org.br/concursos/',
    priority: 10,
    config: {
      allowedDomains: ['cebraspe.org.br'],
      linkPatterns: ['concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.cebraspe.org.br/concursos/em_andamento'],
    },
  },
  {
    slug: 'fgv',
    name: 'FGV Conhecimento',
    base_url: 'https://conhecimento.fgv.br/concursos',
    priority: 9,
    config: {
      allowedDomains: ['fgv.br'],
      linkPatterns: ['fgv', 'concursos', '\\.pdf'],
      seed_urls: ['https://conhecimento.fgv.br/concursos'],
    },
  },
  {
    slug: 'vunesp',
    name: 'Vunesp Concursos',
    base_url: 'https://www.vunesp.com.br/',
    priority: 8,
    config: {
      allowedDomains: ['vunesp.com.br'],
      linkPatterns: ['vunesp', 'concursos', '\\.pdf'],
      seed_urls: ['https://www.vunesp.com.br/MaisRecentes'],
    },
  },
  {
    slug: 'fcc',
    name: 'Fundacao Carlos Chagas',
    base_url: 'https://www.concursosfcc.com.br/concursos/',
    priority: 8,
    config: {
      allowedDomains: ['concursosfcc.com.br', 'fcc.org.br'],
      linkPatterns: ['concursos', 'fcc', '\\.pdf'],
      seed_urls: ['https://www.concursosfcc.com.br/concursos/'],
    },
  },
  {
    slug: 'quadrix',
    name: 'Instituto Quadrix',
    base_url: 'https://quadrix.selecao.net.br/index/abertos/',
    priority: 7,
    config: {
      allowedDomains: ['quadrix.selecao.net.br', 'selecao.net.br'],
      linkPatterns: ['informacoes', '\\.pdf'],
      seed_urls: [
        'https://quadrix.selecao.net.br/index/abertos/',
        'https://quadrix.selecao.net.br/index/1/',
      ],
      urlIncludePatterns: ['informacoes'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'ibfc',
    name: 'IBFC',
    base_url: 'https://www.ibfc.org.br/concurso/',
    priority: 7,
    config: {
      allowedDomains: ['ibfc.org.br'],
      linkPatterns: ['ibfc', 'concurso', '\\.pdf'],
      seed_urls: ['https://www.ibfc.org.br/concurso/'],
    },
  },
  {
    slug: 'idecan',
    name: 'IDECAN',
    base_url: 'https://idecan.org.br/concursos.aspx',
    priority: 7,
    config: {
      allowedDomains: ['idecan.org.br'],
      linkPatterns: ['idecan', 'concursos', '\\.pdf'],
      seed_urls: ['https://idecan.org.br/concursos.aspx'],
    },
  },
  {
    slug: 'aocp',
    name: 'Instituto AOCP',
    base_url: 'https://www.institutoaocp.org.br/concursos.jsp',
    priority: 7,
    config: {
      allowedDomains: ['institutoaocp.org.br'],
      linkPatterns: ['aocp', 'concursos', '\\.pdf'],
      seed_urls: ['https://www.institutoaocp.org.br/concursos.jsp'],
    },
  },
  {
    slug: 'fundatec',
    name: 'Fundatec',
    base_url: 'https://www.fundatec.org.br/portal/concursos/index.php',
    priority: 6,
    config: {
      allowedDomains: ['fundatec.org.br'],
      linkPatterns: ['fundatec', 'concursos', '\\.pdf'],
      seed_urls: ['https://www.fundatec.org.br/portal/concursos/index.php'],
    },
  },
  {
    slug: 'ibade',
    name: 'IBADE',
    base_url: 'https://portal.ibade.selecao.site/edital',
    priority: 6,
    config: {
      allowedDomains: [
        'portal.ibade.selecao.site',
        'cdn-ibade.selecao.site',
        's3.sa-east-1.amazonaws.com',
      ],
      linkPatterns: ['edital', '\\.pdf'],
      seed_urls: ['https://portal.ibade.selecao.site/edital'],
      urlIncludePatterns: ['/edital/'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'institutomais',
    name: 'Instituto Mais',
    base_url: 'https://www.institutomais.org.br/Concursos/ConcursosAbertos',
    priority: 6,
    config: {
      allowedDomains: ['institutomais.org.br'],
      linkPatterns: ['Concursos/Detalhe', '\\.pdf'],
      seed_urls: ['https://www.institutomais.org.br/Concursos/ConcursosAbertos'],
      urlIncludePatterns: ['Concursos/Detalhe'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'cesgranrio',
    name: 'Cesgranrio',
    base_url: 'https://www.cesgranrio.org.br/categoria/concursos/',
    priority: 6,
    config: {
      allowedDomains: ['cesgranrio.org.br', 'concursos.cesgranrio.org.br'],
      linkPatterns: ['concurso', 'concursos', '\\.pdf'],
      seed_urls: [
        'https://www.cesgranrio.org.br/categoria/concursos/',
        'https://www.cesgranrio.org.br/categoria/concursos/feed/',
      ],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'selecon',
    name: 'Selecon',
    base_url: 'https://selecon.org.br/concursos/',
    priority: 6,
    config: {
      allowedDomains: ['selecon.org.br'],
      linkPatterns: ['concursos', '\\.pdf'],
      seed_urls: [
        'https://selecon.org.br/concursos/',
        'https://selecon.org.br/concursos/feed/',
      ],
      urlIncludePatterns: ['concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'iades',
    name: 'IADES',
    base_url: 'https://www.iades.com.br/concursos',
    priority: 5,
    config: {
      allowedDomains: ['iades.com.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.iades.com.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'access',
    name: 'Instituto Access',
    base_url: 'https://www.access.org.br/portal/concursos',
    priority: 5,
    config: {
      allowedDomains: ['access.org.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.access.org.br/portal/concursos'],
      urlIncludePatterns: ['concurso', 'concursos', 'editais'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'consulplan',
    name: 'Consulplan',
    base_url: 'https://www.consulplan.net/concursos',
    priority: 5,
    config: {
      allowedDomains: ['consulplan.net'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.consulplan.net/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'funrio',
    name: 'FUNRIO',
    base_url: 'https://www.funrio.org.br/concursos',
    priority: 4,
    config: {
      allowedDomains: ['funrio.org.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.funrio.org.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'funcab',
    name: 'FUNCAB',
    base_url: 'https://www.funcab.org/concursos',
    priority: 4,
    config: {
      allowedDomains: ['funcab.org'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.funcab.org/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'fundep',
    name: 'FUNDEP',
    base_url: 'https://www.fundep.ufmg.br/concursos',
    priority: 4,
    config: {
      allowedDomains: ['fundep.ufmg.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.fundep.ufmg.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'fumarc',
    name: 'FUMARC',
    base_url: 'https://www.fumarc.com.br/concursos',
    priority: 4,
    config: {
      allowedDomains: ['fumarc.com.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.fumarc.com.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'ibam',
    name: 'IBAM',
    base_url: 'https://www.ibam-concursos.org.br/concursos',
    priority: 4,
    config: {
      allowedDomains: ['ibam-concursos.org.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.ibam-concursos.org.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'nossorumo',
    name: 'Instituto Nosso Rumo',
    base_url: 'https://www.institutonossorumo.org.br/concursos',
    priority: 4,
    config: {
      allowedDomains: ['institutonossorumo.org.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.institutonossorumo.org.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'cetro',
    name: 'Instituto Cetro',
    base_url: 'https://www.institutocetro.org.br/concursos',
    priority: 4,
    config: {
      allowedDomains: ['institutocetro.org.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.institutocetro.org.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'inaz',
    name: 'INAZ',
    base_url: 'https://www.inaz.org.br/concursos',
    priority: 4,
    config: {
      allowedDomains: ['inaz.org.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.inaz.org.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'avancasp',
    name: 'Avanca SP',
    base_url: 'https://www.avancasp.org.br/concursos',
    priority: 4,
    config: {
      allowedDomains: ['avancasp.org.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.avancasp.org.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'cetap',
    name: 'CETAP',
    base_url: 'https://www.cetapnet.com.br/concursos',
    priority: 4,
    config: {
      allowedDomains: ['cetapnet.com.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.cetapnet.com.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos', 'editais'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'fapec',
    name: 'FAPEC',
    base_url: 'https://www.fapec.org/concursos',
    priority: 4,
    config: {
      allowedDomains: ['fapec.org'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.fapec.org/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'copese',
    name: 'COPESE UFJF',
    base_url: 'https://www.copese.ufjf.br/concursos',
    priority: 3,
    config: {
      allowedDomains: ['copese.ufjf.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.copese.ufjf.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'copeve',
    name: 'COPEVE UFAL',
    base_url: 'https://www.copeve.ufal.br/concursos',
    priority: 3,
    config: {
      allowedDomains: ['copeve.ufal.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.copeve.ufal.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'cev',
    name: 'CEV UECE',
    base_url: 'https://www.cev.uece.br/concursos',
    priority: 3,
    config: {
      allowedDomains: ['cev.uece.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.cev.uece.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'ibgp',
    name: 'IBGP',
    base_url: 'https://www.ibgpconcursos.com.br/concursos',
    priority: 4,
    config: {
      allowedDomains: ['ibgpconcursos.com.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.ibgpconcursos.com.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'igeduc',
    name: 'IGEDUC',
    base_url: 'https://www.igeduc.org.br/concursos',
    priority: 3,
    config: {
      allowedDomains: ['igeduc.org.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.igeduc.org.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'ncufpr',
    name: 'NC UFPR',
    base_url: 'https://www.nc.ufpr.br/concursos',
    priority: 3,
    config: {
      allowedDomains: ['nc.ufpr.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.nc.ufpr.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'copeveufmg',
    name: 'COPEVE UFMG',
    base_url: 'https://www.copeve.ufmg.br/concursos',
    priority: 3,
    config: {
      allowedDomains: ['copeve.ufmg.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.copeve.ufmg.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'coseac',
    name: 'COSEAC UFF',
    base_url: 'https://www.coseac.uff.br/concursos',
    priority: 3,
    config: {
      allowedDomains: ['coseac.uff.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.coseac.uff.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'cepsufpa',
    name: 'CEPS UFPA',
    base_url: 'https://www.ceps.ufpa.br/concursos',
    priority: 3,
    config: {
      allowedDomains: ['ceps.ufpa.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.ceps.ufpa.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
  {
    slug: 'fepese',
    name: 'FEPESE',
    base_url: 'https://www.fepese.org.br/concursos',
    priority: 3,
    config: {
      allowedDomains: ['fepese.org.br'],
      linkPatterns: ['concurso', 'concursos', 'edital', '\\.pdf'],
      seed_urls: ['https://www.fepese.org.br/concursos'],
      urlIncludePatterns: ['concurso', 'concursos'],
      urlExcludePatterns: ['resultado', 'gabarito', 'retifica', 'classificacao'],
    },
  },
];

// ============================================
// SCHEMA GUARD (cria tabelas se ausentes)
// ============================================

let schemaChecked = false;
let schemaCheckPromise: Promise<void> | null = null;

async function ensureHarvestSchema() {
  if (schemaChecked) return;
  if (schemaCheckPromise) return schemaCheckPromise;

  schemaCheckPromise = (async () => {
    try {
      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
            CREATE EXTENSION pgcrypto;
          END IF;
        END$$;

        CREATE TABLE IF NOT EXISTS harvest_sources (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          base_url TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'teoria',
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          priority INTEGER NOT NULL DEFAULT 5,
          config JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_harvest_sources_enabled ON harvest_sources(enabled);
        CREATE INDEX IF NOT EXISTS idx_harvest_sources_type ON harvest_sources(type);
        CREATE INDEX IF NOT EXISTS idx_harvest_sources_priority ON harvest_sources(priority DESC);

        CREATE TABLE IF NOT EXISTS harvested_content (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          source_id UUID REFERENCES harvest_sources(id) ON DELETE SET NULL,
          url TEXT NOT NULL,
          title TEXT,
          content_type TEXT NOT NULL DEFAULT 'teoria',
          raw_html TEXT,
          parsed_content JSONB,
          metadata JSONB,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_harvested_content_source ON harvested_content(source_id);
        CREATE INDEX IF NOT EXISTS idx_harvested_content_status ON harvested_content(status);
        CREATE INDEX IF NOT EXISTS idx_harvested_content_type ON harvested_content(content_type);
      `);
      schemaChecked = true;
    } catch (err: any) {
      if (err?.code === '23505' && err?.constraint === 'pg_extension_name_index') {
        console.warn('[harvest] pgcrypto ja existe, continuando');
        schemaChecked = true;
      } else {
        console.error('[harvest] Falha ao garantir schema:', err);
      }
    } finally {
      schemaCheckPromise = null;
    }
  })();

  return schemaCheckPromise;
}

// ============================================
// FONTES DE CONTEUDO
// ============================================

  export async function getSources(filters?: { enabled?: boolean; type?: string }): Promise<HarvestSource[]> {
    await ensureHarvestSchema();
    await syncBancaPresets();

    let sql = `
    SELECT
      hs.*,
      stats.items_harvested,
      stats.last_run,
      CASE
        WHEN hs.enabled IS NOT TRUE THEN 'paused'
        WHEN stats.last_run >= NOW() - INTERVAL '2 hours' THEN 'success'
        WHEN stats.last_run IS NULL THEN 'idle'
        ELSE 'idle'
      END AS runtime_status
    FROM harvest_sources hs
    LEFT JOIN (
      SELECT
        source_id,
        COUNT(*) AS items_harvested,
        MAX(created_at) AS last_run
      FROM harvested_content
      GROUP BY source_id
    ) stats ON stats.source_id = hs.id
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramCount = 1;

  if (filters?.enabled !== undefined) {
    sql += ` AND hs.enabled = $${paramCount++}`;
    params.push(filters.enabled);
  }

  if (filters?.type) {
    sql += ` AND hs.type = $${paramCount++}`;
    params.push(filters.type);
  }

  sql += ' ORDER BY hs.priority DESC, hs.name ASC';

  const { rows } = await query<
    Array<HarvestSource & { config?: any; items_harvested?: number | null; last_run?: Date | string | null; runtime_status?: string | null }>
  >(sql, params);

  return rows.map(mapHarvestSource);
}

export async function getSourceById(id: string): Promise<HarvestSource | null> {
  await ensureHarvestSchema();

  const params: any[] = [id];
  const where = `
    WHERE hs.id::text = $1
      OR lower(hs.name) = lower($1)
      OR lower(hs.name) LIKE '%' || lower($1) || '%'
      OR lower(COALESCE(hs.config->>'banca', '')) = lower($1)
      OR lower(COALESCE(hs.config->>'slug', '')) = lower($1)
  `;

  const { rows } = await query<
    Array<HarvestSource & { config?: any; items_harvested?: number | null; last_run?: Date | string | null; runtime_status?: string | null }>
  >(
    `
      SELECT
        hs.*,
        stats.items_harvested,
        stats.last_run,
        CASE
          WHEN hs.enabled IS NOT TRUE THEN 'paused'
          WHEN stats.last_run >= NOW() - INTERVAL '2 hours' THEN 'success'
          WHEN stats.last_run IS NULL THEN 'idle'
          ELSE 'idle'
        END AS runtime_status
      FROM harvest_sources hs
      LEFT JOIN (
        SELECT
          source_id,
          COUNT(*) AS items_harvested,
          MAX(created_at) AS last_run
        FROM harvested_content
        GROUP BY source_id
      ) stats ON stats.source_id = hs.id
      ${where}
      LIMIT 1
    `,
    params
  );

  if (rows.length === 0) return null;
  return mapHarvestSource(rows[0]);
}

export async function addSource(data: Partial<HarvestSource>): Promise<string> {
  await ensureHarvestSchema();

  const serializedConfig = data.config ? JSON.stringify(data.config) : JSON.stringify({});
  const { rows } = await query<{ id: string }>(
    `
      INSERT INTO harvest_sources (
        name, base_url, type, enabled, priority, config
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [
      data.name,
      data.base_url,
      data.type || 'teoria',
      data.enabled !== undefined ? data.enabled : true,
      data.priority || 5,
      serializedConfig,
    ]
  );

  return rows[0].id;
}

export async function updateSource(id: string, data: Partial<HarvestSource>): Promise<void> {
  await ensureHarvestSchema();

  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(data.name);
  }

  if (data.base_url !== undefined) {
    fields.push(`base_url = $${paramCount++}`);
    values.push(data.base_url);
  }

  if (data.enabled !== undefined) {
    fields.push(`enabled = $${paramCount++}`);
    values.push(data.enabled);
  }

  if (data.type !== undefined) {
    fields.push(`type = $${paramCount++}`);
    values.push(data.type);
  }

  if (data.priority !== undefined) {
    fields.push(`priority = $${paramCount++}`);
    values.push(data.priority);
  }

  if (data.config !== undefined) {
    fields.push(`config = $${paramCount++}`);
    values.push(JSON.stringify(data.config ?? {}));
  }

  if (fields.length === 0) return;

  values.push(id);

  await query(`UPDATE harvest_sources SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`, values);
}

// ============================================
// HELPERS - CONFIG
// ============================================

function mergeConfigs(...configs: Array<HarvestSourceConfig | Partial<HarvestSourceConfig> | undefined>): HarvestSourceConfig {
  const merged: HarvestSourceConfig = {};
  const arrayFields: Array<keyof HarvestSourceConfig> = [
    'seed_urls',
    'seedUrls',
    'seeds',
    'paths',
    'sitemap_urls',
    'sitemapUrls',
    'linkPatterns',
    'bannedPatterns',
    'allowedDomains',
    'textIncludePatterns',
    'textExcludePatterns',
    'urlIncludePatterns',
    'urlExcludePatterns',
  ];

  for (const cfg of configs) {
    if (!cfg) continue;
    for (const [key, value] of Object.entries(cfg)) {
      const typedKey = key as keyof HarvestSourceConfig;
      if (!value) continue;
      if (arrayFields.includes(typedKey) && Array.isArray(value)) {
        const existing = (merged[typedKey] as string[] | undefined) || [];
        merged[typedKey] = Array.from(new Set([...existing, ...value])) as any;
      } else {
        (merged as any)[typedKey] = value;
      }
    }
  }

  return merged;
}

  let presetsSynced = false;
  let presetsSyncPromise: Promise<void> | null = null;

  async function syncBancaPresets(): Promise<void> {
    if (presetsSynced) return;
    if (presetsSyncPromise) return presetsSyncPromise;

    presetsSyncPromise = (async () => {
      try {
        const { rows } = await query<{ name: string; base_url: string }>(
          'SELECT name, base_url FROM harvest_sources'
        );
        const existing = new Set(
          rows.flatMap((row) => [normalizeHint(row.name), normalizeHint(row.base_url)])
        );

        for (const preset of BANCA_PRESETS) {
          const nameKey = normalizeHint(preset.name);
          const urlKey = normalizeHint(preset.base_url);
          if (existing.has(nameKey) || existing.has(urlKey)) continue;

          const mergedConfig = mergeConfigs(DEFAULT_EDITAL_FILTERS, preset.config, {
            banca: preset.slug,
          });
          await addSource({
            name: preset.name,
            base_url: preset.base_url,
            type: 'edital',
            enabled: true,
            priority: preset.priority ?? 8,
            config: mergedConfig,
          });
        }

        presetsSynced = true;
      } catch (err) {
        console.warn('[harvest] Falha ao sincronizar presets:', err);
      } finally {
        presetsSyncPromise = null;
      }
    })();

    return presetsSyncPromise;
  }

  function normalizeHint(hint?: string): string {
    return (hint || '').toString().trim().toLowerCase();
  }

function getPresetByHint(hint?: string): BancaPreset | undefined {
  const slug = normalizeHint(hint);
  if (!slug) return undefined;
  return BANCA_PRESETS.find(
    (preset) => preset.slug === slug || normalizeHint(preset.name) === slug || normalizeHint(preset.base_url).includes(slug)
  );
}

async function resolveHarvestSource(sourceId: string, overrideConfig?: Partial<HarvestSourceConfig>): Promise<HarvestSource> {
  const hint = normalizeHint(overrideConfig?.banca || sourceId);
  let source = await getSourceById(sourceId);

  if (!source) {
    const preset = getPresetByHint(hint);
    if (!preset) {
      throw new Error(`Fonte nao encontrada para ${sourceId}`);
    }

    const mergedConfig = mergeConfigs(DEFAULT_EDITAL_FILTERS, preset.config, overrideConfig, { banca: overrideConfig?.banca || preset.slug });

    const newId = await addSource({
      name: preset.name,
      base_url: preset.base_url,
      type: 'edital',
      enabled: true,
      priority: preset.priority ?? 8,
      config: mergedConfig,
    });

    source = await getSourceById(newId);
  }

  if (!source) {
    throw new Error('Fonte nao encontrada');
  }

  const presetFromSource = getPresetByHint(
    normalizeHint(overrideConfig?.banca || source.config?.banca || source.name || source.base_url || sourceId)
  );
  const mergedConfig = mergeConfigs(
    DEFAULT_EDITAL_FILTERS,
    presetFromSource?.config,
    source.config,
    overrideConfig,
    {
      banca: overrideConfig?.banca || source.banca || presetFromSource?.slug || hint || sourceId,
    }
  );
  source.config = mergedConfig;
  if (mergedConfig.banca) {
    source.banca = mergedConfig.banca;
  }

  if (isJcConcursosSource(source)) {
    source.config.urlIncludePatterns = ['jcconcursos.com.br/concurso/'];
    source.config.linkPatterns = ['\\/concurso\\/'];
    source.config.textIncludePatterns = ['.*'];
  }

  return source;
}

// ============================================
// COLETA DE CONTEUDO
// ============================================

export async function fetchContent(url: string, source?: HarvestSource): Promise<{ html: string; metadata: any }> {
  console.log(`[harvest] Fetching content from: ${url}`);

  try {
    const fetchUrl = isJcConcursosSource(source, url) ? toJinaUrl(url) : url;
    const html = await fetchHtml(fetchUrl);
    const metadata = extractMetadata(html, url, source);
    return { html, metadata };
  } catch (err) {
    console.error(`[harvest] Erro ao buscar ${url}:`, err);
    throw err;
  }
}

export async function parseContent(html: string, contentType: string): Promise<any> {
  console.log(`[harvest] Parsing content, type: ${contentType}`);

  const articleText = extractArticleBody(html);
  const parsed: any = {
    text: articleText || extractText(html),
    headings: extractHeadings(html),
    links: extractLinks(html),
    images: extractImages(html),
  };

  if (contentType === 'questoes') {
    parsed.questions = extractQuestions(html);
  } else if (contentType === 'teoria') {
    parsed.sections = extractSections(html);
  }

  return parsed;
}

export async function saveHarvest(data: {
  sourceId: string;
  url: string;
  title: string;
  contentType: string;
  rawHtml: string;
  parsedContent: any;
  metadata?: any;
}): Promise<string> {
  console.log(`[harvest] Salvando conteudo: ${data.title}`);

  const existing = await query<{ id: string }>(
    'SELECT id FROM harvested_content WHERE source_id = $1 AND url = $2 LIMIT 1',
    [data.sourceId, data.url]
  );
  if (existing.rows[0]?.id) {
    return existing.rows[0].id;
  }

  const { rows } = await query<{ id: string }>(
    `
      INSERT INTO harvested_content (
        source_id, url, title, content_type, raw_html,
        parsed_content, metadata, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `,
    [
      data.sourceId,
      data.url,
      data.title,
      data.contentType,
      data.rawHtml,
      JSON.stringify(data.parsedContent),
      JSON.stringify(data.metadata || {}),
      'completed',
    ]
  );

  return rows[0].id;
}

// ============================================
// IMPORTAÇÃO PARA EDITAIS
// ============================================

export async function parsePdfFromUrl(
  url: string,
  options?: { includeBuffer?: boolean }
): Promise<ParsedHarvestedPdf | null> {
  try {
    console.log(`[harvest] Baixando PDF: ${url}`);
    const buffer = await fetchBufferWithTimeout(url, PDF_FETCH_TIMEOUT_MS, PDF_MAX_BYTES);
    if (!isPdfBuffer(buffer)) {
      console.warn('[harvest] Conteudo baixado nao parece PDF');
      return null;
    }
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
    let text = '';
    let pages: number | undefined;
    let method: ParsedHarvestedPdf['method'] = 'none';
    let ocrUsed = false;
    let signalLow = false;

    const pdftotextText = await extractTextViaPdftotext(buffer);
    if (pdftotextText) {
      text = pdftotextText;
      method = 'pdftotext';
      console.log('[harvest] Texto extraido via pdftotext');
    }

    if (!text) {
      const parsed = await pdfParse(buffer);
      text = parsed.text || '';
      pages = parsed.numpages;
      if (text) {
        method = 'pdf-parse';
      }
      console.log('[harvest] Texto extraido via pdf-parse');
    }

    signalLow = isLowSignalText(text);
    if (signalLow) {
      ocrUsed = true;
      const ocrText = await extractTextViaOcr(buffer);
      if (ocrText) {
        text = ocrText;
        method = 'ocr';
        console.log('[harvest] Texto extraido via OCR');
      }
    }

    const normalizedText = text || '';
    const words = normalizedText.split(/\s+/).filter(Boolean).length;
    const ocrStatus: ParsedHarvestedPdf['ocr_status'] =
      normalizedText.trim().length > 0 ? 'ok' : 'falhou';
    const classification = classifyPdfText(normalizedText);
    return {
      text: normalizedText,
      words,
      pages,
      buffer: options?.includeBuffer ? buffer : undefined,
      method,
      ocr_status: ocrStatus,
      ocr_used: ocrUsed,
      signal_low: signalLow,
      content_hash: contentHash,
      classification,
    };
  } catch (err) {
    console.warn('[harvest] Falha no OCR/parse de PDF', err);
    return null;
  }
}

type PdfCacheMeta = {
  status?: ParsedHarvestedPdf['ocr_status'];
  method?: ParsedHarvestedPdf['method'];
  ocr_used?: boolean;
  words?: number;
  pages?: number;
  signal_low?: boolean;
};

function normalizePdfCacheMeta(meta: any): PdfCacheMeta {
  if (!meta) return {};
  let value = meta;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== 'object') return {};
  return {
    status: typeof value.status === 'string' ? value.status : undefined,
    method: typeof value.method === 'string' ? value.method : undefined,
    ocr_used: typeof value.ocr_used === 'boolean' ? value.ocr_used : undefined,
    words: typeof value.words === 'number' ? value.words : undefined,
    pages: typeof value.pages === 'number' ? value.pages : undefined,
    signal_low: typeof value.signal_low === 'boolean' ? value.signal_low : undefined,
  };
}

function buildCachedPdfExtraction(entry: EditalPdfCacheEntry): ParsedHarvestedPdf | null {
  if (!entry?.text_content) return null;
  const meta = normalizePdfCacheMeta(entry.ocr_meta);
  const text = entry.text_content || '';
  const words = typeof meta.words === 'number'
    ? meta.words
    : text.split(/\s+/).filter(Boolean).length;
  const ocrStatus: ParsedHarvestedPdf['ocr_status'] =
    meta.status || (text.trim().length > 0 ? 'ok' : 'falhou');
  return {
    text,
    words,
    pages: meta.pages,
    method: meta.method ?? 'none',
    ocr_status: ocrStatus,
    ocr_used: meta.ocr_used ?? false,
    signal_low: meta.signal_low ?? false,
    content_hash: entry.content_hash ?? undefined,
    classification: entry.classification ?? undefined,
    cached: true,
  };
}

export async function importHarvestedToEdital(
  harvestId: string,
  options?: {
    forceExtraction?: boolean;
    pdfOnly?: boolean;
    onProgress?: (progress: number, step: string, data?: Record<string, any>) => void | Promise<void>;
  }
): Promise<{ editalId: string; created?: boolean }> {
  await ensureHarvestSchema();
  const item = await getHarvestedById(harvestId);
  if (!item) {
    throw new Error('Conteudo coletado nao encontrado');
  }

  const reportProgress = async (
    progress: number,
    step: string,
    data?: Record<string, any>
  ) => {
    if (!options?.onProgress) return;
    try {
      await options.onProgress(progress, step, data);
    } catch (err) {
      console.warn('[harvest] Falha ao reportar progresso:', err);
    }
  };

  const meta = item.metadata || {};
  await reportProgress(5, 'coletado', { harvest_id: harvestId });
  const title = meta.title || meta.titulo || item.title || 'Edital coletado';
  const orgao = meta.orgao || meta.source || meta.author || 'N/A';
  const banca = meta.banca || meta.exam_board || meta.banca_slug || meta.source;
  const link = meta.original_url || meta.edital_url || meta.url || item.url;
  const publication = meta.data_publicacao || meta.date || item.harvested_at || new Date().toISOString();

  const parsedContent = typeof item.parsed_content === 'string'
    ? JSON.parse(item.parsed_content)
    : item.parsed_content || {};
  const parsedText = typeof parsedContent?.text === 'string' ? parsedContent.text : '';
  const htmlText = item.raw_html ? extractText(item.raw_html) : '';
  const htmlStructuredText = item.raw_html ? extractTextWithBreaks(item.raw_html) : '';
  let pdfText = '';
  let pdfExtraction: ParsedHarvestedPdf | null = null;
  let pdfCacheEntry: EditalPdfCacheEntry | null = null;
  let pdfCacheHit = false;
  const preloadedBuffers = new Map<string, Buffer>();

  const pdfCandidate =
    meta.edital_url ||
    meta.original_url ||
    (link && /\.pdf(\?|$)/i.test(link) ? link : undefined);

  if (pdfCandidate) {
    pdfCacheEntry = await getPdfCacheByUrl(pdfCandidate);
    const cacheIsFresh = pdfCacheEntry ? isPdfCacheFresh(pdfCacheEntry) : false;
    if (cacheIsFresh) {
      const cachedExtraction = buildCachedPdfExtraction(pdfCacheEntry);
      if (cachedExtraction) {
        pdfExtraction = cachedExtraction;
        pdfText = cachedExtraction.text;
        pdfCacheHit = true;
      }
    } else if (pdfCacheEntry) {
      pdfCacheEntry = null;
    }
  }

  if (pdfCandidate && !pdfExtraction) {
    pdfExtraction = await parsePdfFromUrl(pdfCandidate, { includeBuffer: true });
    if (pdfExtraction?.text) {
      pdfText = pdfExtraction.text;
    }
    if (pdfExtraction?.buffer) {
      preloadedBuffers.set(pdfCandidate, pdfExtraction.buffer);
    }
  }

  if (pdfExtraction?.cached && pdfText && !pdfExtraction.classification) {
    pdfExtraction.classification = classifyPdfText(pdfText);
  }

  if (pdfCandidate) {
    recordCacheHit(pdfCacheHit);
  }

  if (pdfCandidate) {
    const progressStep = pdfExtraction?.cached
      ? 'pdf_cache'
      : (pdfExtraction?.ocr_used ? 'ocr' : 'pdf_lido');
    await reportProgress(25, progressStep, {
      words: pdfExtraction?.words ?? 0,
      cache_hit: pdfCacheHit,
    });
  } else {
    await reportProgress(15, 'sem_pdf');
  }

  const textCandidates = [pdfText, htmlStructuredText, parsedText, htmlText].filter((value) => value && value.length > 0);
  textCandidates.sort((a, b) => b.length - a.length);
  const mainText = textCandidates[0] || '';
  const combinedText = textCandidates.join('\n');
  const pdfSyllabusText = pdfText ? extractSyllabusSection(pdfText) : '';
  const pdfExamMatrixText = pdfText ? extractExamMatrixSection(pdfText) : '';
  const syllabusText = pdfSyllabusText || (pdfText ? '' : extractSyllabusSection(mainText));
  const examMatrixText = pdfExamMatrixText || (pdfText ? '' : extractExamMatrixSection(mainText));
  const tableSourceText = examMatrixText || '';
  let examMatrixRows = filterExamMatrixRows(extractExamMatrixRows(tableSourceText));
  let ocrExamMatrixText = '';
  const cargoRows = extractCargoRows(tableSourceText);

  if (countExamMatrixRowsWithNumbers(examMatrixRows) < 2 && pdfExtraction?.buffer) {
    const ocrResult = await extractExamMatrixRowsFromOcr(pdfExtraction.buffer);
    ocrExamMatrixText = ocrResult.text;
    const ocrRows = filterExamMatrixRows(ocrResult.rows);
    examMatrixRows = pickBestExamMatrixRows(examMatrixRows, ocrRows);
  }

  if (countExamMatrixRowsWithNumbers(examMatrixRows) < 2) {
    const aiSource = examMatrixText || ocrExamMatrixText || pdfText || mainText;
    const aiRows = filterExamMatrixRows(await extractExamMatrixRowsWithAi(aiSource, title, banca));
    examMatrixRows = pickBestExamMatrixRows(examMatrixRows, aiRows);
  }

  const examMatrixSummary = examMatrixRows.length
    ? examMatrixRows
        .map((row) => {
          const questoes = row.numero_questoes !== undefined ? row.numero_questoes : '-';
          const peso = row.peso !== undefined ? row.peso : '-';
          return `${row.disciplina} | questoes: ${questoes} | peso: ${peso}`;
        })
        .join('\n')
    : '';
  const cargoSummary = cargoRows.length
    ? cargoRows
        .map((cargo) => {
          const vagas = cargo.vagas ?? '-';
          const salario = cargo.salario !== undefined ? cargo.salario : '-';
          return `${cargo.nome} | vagas: ${vagas} | salario: ${salario}`;
        })
        .join('\n')
    : '';
  const examMatrixTextForAi = examMatrixText || ocrExamMatrixText;
  const aiText = [syllabusText, examMatrixTextForAi, examMatrixSummary, cargoSummary].filter(Boolean).join('\n\n');

  let descricao = meta.description || meta.descricao || '';
  if (!descricao && mainText) {
    descricao = mainText.slice(0, 800);
  }

  const dates = combinedText ? extractDatesFromText(combinedText) : {};

  const numeroVagasRaw = meta.numero_vagas !== undefined ? Number(meta.numero_vagas) : undefined;
  const numeroVagasExtracted = extractNumeroVagas(combinedText);
  const numeroVagasFromCargos = cargoRows.reduce((sum, cargo) => sum + (cargo.vagas || 0), 0);
  const numeroVagas = Number.isNaN(numeroVagasRaw)
    ? resolveNumeroVagas(undefined, numeroVagasExtracted, numeroVagasFromCargos)
    : resolveNumeroVagas(numeroVagasRaw, numeroVagasExtracted, numeroVagasFromCargos);
  const numeroInscritosRaw = meta.numero_inscritos !== undefined ? Number(meta.numero_inscritos) : undefined;
  const numeroInscritos = Number.isNaN(numeroInscritosRaw) ? 0 : (numeroInscritosRaw ?? 0);
  const taxaInscricao = meta.taxa_inscricao !== undefined
    ? parseCurrency(String(meta.taxa_inscricao))
    : extractTaxaInscricao(combinedText);

  let disciplinas: EditalDisciplina[] = Array.isArray(meta.disciplinas) ? meta.disciplinas : [];
  let conteudoProgramatico = meta.conteudo_programatico && typeof meta.conteudo_programatico === 'object'
    ? meta.conteudo_programatico
    : {};
  let cargos: EditalCargo[] = Array.isArray(meta.cargos) ? meta.cargos : [];
  const aiTextForExtraction = aiText || (options?.forceExtraction ? (pdfText || combinedText) : '');
  const aiFallbackText = pdfText && pdfText !== aiTextForExtraction ? pdfText : undefined;
  let extractedDisciplinas: EditalDisciplina[] = [];
  let extractedConteudo: Record<string, any> = {};
  let extractedCargos: EditalCargo[] = [];

    if (aiTextForExtraction && (options?.forceExtraction || needsDisciplinaEnrichment(disciplinas, conteudoProgramatico))) {
      const extracted = await extractDisciplinasFromText(aiTextForExtraction, title, banca, aiFallbackText);
      extractedDisciplinas = extracted.disciplinas;
      extractedConteudo = extracted.conteudo_programatico;
      if (options?.forceExtraction) {
        if (extractedDisciplinas.length) {
          disciplinas = extractedDisciplinas;
        }
        if (Object.keys(extractedConteudo).length) {
          conteudoProgramatico = extractedConteudo;
        }
      } else {
        if (disciplinas.length === 0) {
          disciplinas = extractedDisciplinas;
        }
        if (Object.keys(conteudoProgramatico).length === 0) {
          conteudoProgramatico = extractedConteudo;
        }
      }
    }

  const heuristicProgram = extractProgrammaticContentFromText(syllabusText);
  if (heuristicProgram.disciplinas.length) {
    if (disciplinas.length === 0) {
      disciplinas = heuristicProgram.disciplinas;
    } else {
      const merged = mergeDisciplinas(disciplinas, heuristicProgram.disciplinas);
      if (merged.changed) disciplinas = merged.merged;
    }
  }
  if (Object.keys(heuristicProgram.conteudo_programatico).length) {
    const mergedConteudo = mergeConteudoProgramatico(conteudoProgramatico, heuristicProgram.conteudo_programatico);
    if (mergedConteudo.changed) conteudoProgramatico = mergedConteudo.merged;
  }

  const tableDisciplinas: EditalDisciplina[] = examMatrixRows
    .filter((row) => isValidExamMatrixRow(row))
    .map((row) => ({
      nome: row.disciplina,
      numero_questoes: row.numero_questoes,
      peso: row.peso,
    }));

  if (tableDisciplinas.length) {
    if (extractedDisciplinas.length) {
      const merged = mergeDisciplinas(extractedDisciplinas, tableDisciplinas);
      extractedDisciplinas = merged.merged;
      if (disciplinas.length === 0) {
        disciplinas = extractedDisciplinas;
      }
    } else if (disciplinas.length) {
      const merged = mergeDisciplinas(disciplinas, tableDisciplinas);
      if (merged.changed) disciplinas = merged.merged;
    } else {
      disciplinas = tableDisciplinas;
    }
  }

    if (aiTextForExtraction && (options?.forceExtraction || needsCargoEnrichment(cargos))) {
      extractedCargos = await extractCargosFromText(aiTextForExtraction, title, banca, aiFallbackText);
      if (options?.forceExtraction) {
        if (extractedCargos.length) {
          cargos = extractedCargos;
        }
      } else if (cargos.length === 0) {
        cargos = extractedCargos;
      }
    }

  if (cargoRows.length) {
    if (cargos.length) {
      const merged = mergeCargos(cargos, cargoRows);
      if (merged.changed) cargos = merged.merged;
    } else {
      cargos = cargoRows;
    }
    if (extractedCargos.length) {
      const merged = mergeCargos(extractedCargos, cargoRows);
      if (merged.changed) extractedCargos = merged.merged;
    } else {
      extractedCargos = cargoRows;
    }
  }

  extractedDisciplinas = sanitizeDisciplinas(extractedDisciplinas);
  extractedConteudo = sanitizeConteudoProgramatico(extractedConteudo, extractedDisciplinas);
  disciplinas = sanitizeDisciplinas(disciplinas);
  conteudoProgramatico = sanitizeConteudoProgramatico(conteudoProgramatico, disciplinas);
  if (disciplinas.length === 0 && Object.keys(conteudoProgramatico).length > 0) {
    disciplinas = sanitizeDisciplinas(
      Object.keys(conteudoProgramatico).map((nome) => ({ nome } as EditalDisciplina))
    );
  }
  conteudoProgramatico = sanitizeConteudoProgramatico(conteudoProgramatico, disciplinas);

  await reportProgress(60, 'materias_processadas', {
    disciplinas: disciplinas.length,
    conteudos: Object.keys(conteudoProgramatico || {}).length,
  });
  await reportProgress(65, 'cargos_processados', {
    cargos: cargos.length,
  });

  const codigo = meta.codigo || createCodigoFromUrl(link, banca || meta.source) || harvestId;

  const { editalRepository } = await import('../repositories/editalRepository');
  let existing: any = null;

  if (link) {
    const { rows } = await query<any>(
      'SELECT * FROM editais WHERE link_edital_completo = $1 LIMIT 1',
      [link]
    );
    existing = rows[0] || null;
  }

    if (!existing && codigo) {
      existing = await editalRepository.findByCodigo(codigo);
    }

    const status = normalizeEditalStatus(meta.status);
    const tags = Array.isArray(meta.tags) ? meta.tags : [];
    let editalId = '';
    let created = false;

    if (options?.pdfOnly && existing?.id) {
      editalId = existing.id;
      const currentArquivos: EditalArquivo[] = Array.isArray(existing.arquivos) ? existing.arquivos : [];
      const pdfLinks = collectPdfLinks(meta, link);
      const pdfPrefix = FileStorageService.buildEditalStoragePrefix({
        banca,
        publication,
        editalId,
      });
      const storedPdfs = await storePdfAttachments(editalId, pdfLinks, currentArquivos, preloadedBuffers, {
        prefix: pdfPrefix,
      });
      if (storedPdfs.added.length || (storedPdfs.primaryUrl && !existing.link_edital_completo)) {
        const updatePayload: any = { id: editalId, arquivos: storedPdfs.arquivos };
        if (storedPdfs.primaryUrl && !existing.link_edital_completo) {
          updatePayload.link_edital_completo = storedPdfs.primaryUrl;
        }
        await editalRepository.update(updatePayload, undefined);
      }
      await reportProgress(80, 'pdfs_salvos', {
        arquivos: storedPdfs.arquivos.length,
      });
      await refreshEditalProcessingSteps(editalId, { hasEditalPdf: storedPdfs.arquivos.length > 0 });
      await reportProgress(100, 'finalizado', { edital_id: editalId });
      return { editalId };
    }

  const shouldUpdateText = (current?: string | null) => !current || current.trim() === '' || current === 'N/A';
  const shouldUpdateDate = (current?: string | null) => {
    if (!current) return true;
    const year = new Date(current).getUTCFullYear();
    const nowYear = new Date().getUTCFullYear();
    return year < nowYear - 2 || year > nowYear + 4;
  };
  const shouldUpdateNumeroVagas = (current?: number | null) => {
    if (!current || current <= 0) return true;
    if (numeroVagasFromCargos && numeroVagasFromCargos > 0) {
      const diff = Math.abs(current - numeroVagasFromCargos);
      const threshold = Math.max(5, Math.ceil(numeroVagasFromCargos * 0.2));
      if (diff >= threshold && numeroVagas === numeroVagasFromCargos) return true;
    }
    if (current > 5000 && numeroVagas > 0 && numeroVagas <= 5000) return true;
    return false;
  };

  if (existing) {
    const updates: any = { id: existing.id };

    if (shouldUpdateText(existing.titulo) && title) updates.titulo = title;
    if (shouldUpdateText(existing.orgao) && orgao) updates.orgao = orgao;
    if (shouldUpdateText(existing.banca) && banca) updates.banca = banca;
    if (shouldUpdateText(existing.descricao) && descricao) updates.descricao = descricao;
    if (shouldUpdateDate(existing.data_publicacao)) {
      updates.data_publicacao = dates.publication || publication || null;
    }
    if (shouldUpdateDate(existing.data_inscricao_inicio)) {
      updates.data_inscricao_inicio = dates.inscricaoInicio || null;
    }
    if (shouldUpdateDate(existing.data_inscricao_fim)) {
      updates.data_inscricao_fim = dates.inscricaoFim || null;
    }
    if (shouldUpdateDate(existing.data_prova_prevista)) {
      updates.data_prova_prevista = dates.provaPrevista || null;
    }
    if (numeroVagas && shouldUpdateNumeroVagas(existing.numero_vagas)) {
      updates.numero_vagas = numeroVagas;
    }
    if ((existing.numero_inscritos || 0) === 0 && numeroInscritos) updates.numero_inscritos = numeroInscritos;
    if (!existing.taxa_inscricao && taxaInscricao) updates.taxa_inscricao = taxaInscricao;
    const disciplinaMergeSource = extractedDisciplinas.length ? extractedDisciplinas : disciplinas;
    const sanitizedDisciplines = sanitizeDisciplinas(disciplinaMergeSource);
    const existingDisciplines = Array.isArray(existing.disciplinas) ? existing.disciplinas : [];
    const sanitizedExistingDisciplines = sanitizeDisciplinas(existingDisciplines);

    if (options?.forceExtraction) {
      updates.disciplinas = sanitizedDisciplines;
    } else if (existingDisciplines.length === 0 && sanitizedDisciplines.length) {
      updates.disciplinas = sanitizedDisciplines;
    } else if (sanitizedDisciplines.length) {
      const merged = mergeDisciplinas(existingDisciplines, sanitizedDisciplines);
      const mergedSanitized = sanitizeDisciplinas(merged.merged);
      if (merged.changed || !areSameDisciplinas(existingDisciplines, mergedSanitized)) {
        updates.disciplinas = mergedSanitized;
      }
    } else if (!areSameDisciplinas(existingDisciplines, sanitizedExistingDisciplines)) {
      updates.disciplinas = sanitizedExistingDisciplines;
    }

    const conteudoMergeSource = Object.keys(extractedConteudo).length
      ? extractedConteudo
      : conteudoProgramatico;
    const existingConteudo = existing.conteudo_programatico && typeof existing.conteudo_programatico === 'object'
      ? existing.conteudo_programatico
      : {};
    const conteudoAllowed = updates.disciplinas
      ? updates.disciplinas
      : (sanitizedDisciplines.length ? sanitizedDisciplines : sanitizedExistingDisciplines);
    const sanitizedConteudoSource = sanitizeConteudoProgramatico(conteudoMergeSource, conteudoAllowed);
    const sanitizedExistingConteudo = sanitizeConteudoProgramatico(existingConteudo, conteudoAllowed);
    const conteudoMerged = mergeConteudoProgramatico(sanitizedExistingConteudo, sanitizedConteudoSource);
    const conteudoFinal = sanitizeConteudoProgramatico(conteudoMerged.merged, conteudoAllowed);

    if (options?.forceExtraction) {
      updates.conteudo_programatico = conteudoFinal;
    } else if (conteudoMerged.changed || !areSameConteudoProgramatico(existingConteudo, conteudoFinal)) {
      updates.conteudo_programatico = conteudoFinal;
    }
    if (!existing.link_edital_completo && link) updates.link_edital_completo = link;
    if (tags.length && (!Array.isArray(existing.tags) || existing.tags.length === 0)) updates.tags = tags;
    const cargoMergeSource = extractedCargos.length ? extractedCargos : cargos;
    const existingCargos = Array.isArray(existing.cargos) ? existing.cargos : [];
    if (existingCargos.length === 0 && cargoMergeSource.length) {
      updates.cargos = cargoMergeSource;
    } else if (cargoMergeSource.length) {
      const merged = mergeCargos(existingCargos, cargoMergeSource);
      if (merged.changed) updates.cargos = merged.merged;
    }
    if (status && shouldUpdateText(existing.status)) updates.status = status;

    if (Object.keys(updates).length > 1) {
      await editalRepository.update(updates, undefined);
    }

    editalId = existing.id;
  } else {
    const createdEdital = await editalRepository.create({
      codigo,
      titulo: title,
      orgao,
      banca: banca || undefined,
      status,
      data_publicacao: dates.publication || publication,
      data_inscricao_inicio: dates.inscricaoInicio || meta.data_inscricao_inicio,
      data_inscricao_fim: dates.inscricaoFim || meta.data_inscricao_fim,
      data_prova_prevista: dates.provaPrevista || meta.data_prova_prevista,
      descricao,
      cargos,
      disciplinas,
      conteudo_programatico: conteudoProgramatico,
      link_edital_completo: link,
      link_inscricao: meta.link_inscricao || undefined,
      numero_vagas: numeroVagas || 0,
      numero_inscritos: numeroInscritos || 0,
      taxa_inscricao: taxaInscricao || undefined,
      tags,
      observacoes: meta.author || undefined,
    }, undefined);

    editalId = createdEdital.id;
    created = true;
  }

  const currentArquivos: EditalArquivo[] = Array.isArray(existing?.arquivos) ? existing.arquivos : [];
  const pdfLinks = collectPdfLinks(meta, link);
  const pdfPrefix = FileStorageService.buildEditalStoragePrefix({
    banca,
    publication: dates.publication || publication,
    editalId,
  });
  const storedPdfs = await storePdfAttachments(editalId, pdfLinks, currentArquivos, preloadedBuffers, {
    prefix: pdfPrefix,
  });
  if (storedPdfs.added.length) {
    const updatePayload: any = { id: editalId, arquivos: storedPdfs.arquivos };
    if (
      storedPdfs.primaryUrl &&
      (!existing?.link_edital_completo || existing.link_edital_completo === link)
    ) {
      updatePayload.link_edital_completo = storedPdfs.primaryUrl;
    }
    await editalRepository.update(updatePayload, undefined);
  }

  await reportProgress(75, 'pdfs_salvos', {
    arquivos: storedPdfs.arquivos.length,
  });

  let pdfClassification = pdfExtraction?.classification;
  if (pdfCandidate && pdfExtraction?.text && !pdfClassification) {
    pdfClassification = classifyPdfText(pdfExtraction.text);
  }

  if (pdfCandidate && pdfExtraction?.text) {
    const ocrMeta = {
      status: pdfExtraction?.ocr_status,
      method: pdfExtraction?.method,
      ocr_used: pdfExtraction?.ocr_used,
      words: pdfExtraction?.words,
      pages: pdfExtraction?.pages,
      signal_low: pdfExtraction?.signal_low,
    };
    const shouldUpsertCache =
      !pdfCacheEntry ||
      (!pdfCacheEntry.edital_id && !!editalId) ||
      (!pdfCacheEntry.classification && !!pdfClassification) ||
      (!pdfCacheEntry.content_hash && !!pdfExtraction?.content_hash) ||
      (!pdfCacheEntry.text_content && !!pdfExtraction?.text);

    if (shouldUpsertCache) {
      await upsertPdfCache({
        sourceUrl: pdfCandidate,
        editalId,
        contentHash: pdfExtraction?.content_hash ?? pdfCacheEntry?.content_hash ?? null,
        textContent: pdfExtraction.text,
        classification: pdfClassification ?? null,
        ocrMeta,
      });
    } else if (pdfCacheEntry && !pdfCacheEntry.edital_id) {
      await linkPdfCacheToEdital(pdfCandidate, editalId);
    }
  } else if (pdfCandidate && pdfCacheEntry && !pdfCacheEntry.edital_id) {
    await linkPdfCacheToEdital(pdfCandidate, editalId);
  }

  const metadataPatch: Record<string, any> = {
    codigo,
    edital_id: editalId,
    data_publicacao: dates.publication || publication,
    data_inscricao_inicio: dates.inscricaoInicio,
    data_inscricao_fim: dates.inscricaoFim,
    data_prova_prevista: dates.provaPrevista,
    numero_vagas: numeroVagas,
    numero_inscritos: numeroInscritos,
    taxa_inscricao: taxaInscricao,
  };

  if (pdfCandidate) {
    metadataPatch.pdf_extraction = {
      status: pdfExtraction?.ocr_status ?? 'falhou',
      method: pdfExtraction?.method ?? 'none',
      ocr_used: pdfExtraction?.ocr_used ?? false,
      words: pdfExtraction?.words ?? 0,
      pages: pdfExtraction?.pages ?? null,
      signal_low: pdfExtraction?.signal_low ?? false,
    };
    if (pdfClassification) metadataPatch.pdf_classification = pdfClassification;
    if (pdfExtraction?.content_hash) metadataPatch.pdf_hash = pdfExtraction.content_hash;
    metadataPatch.pdf_cache_hit = pdfCacheHit;
  }

  if (options?.forceExtraction) {
    metadataPatch.disciplinas = disciplinas;
    metadataPatch.conteudo_programatico = conteudoProgramatico;
  } else {
    if (disciplinas.length) metadataPatch.disciplinas = disciplinas;
    if (Object.keys(conteudoProgramatico).length) metadataPatch.conteudo_programatico = conteudoProgramatico;
  }
  if (cargos.length) metadataPatch.cargos = cargos;
  if (link) metadataPatch.link_edital_completo = link;
  if (storedPdfs.added.length) metadataPatch.arquivos = storedPdfs.arquivos;
  if (meta.provas_url) metadataPatch.provas_url = meta.provas_url;

  await query(
    "UPDATE harvested_content SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb WHERE id = $1",
    [harvestId, JSON.stringify(metadataPatch)]
  );

  const cronogramaDates: ParsedDates = {
    publication: dates.publication || meta.data_publicacao || existing?.data_publicacao || publication,
    inscricaoInicio: dates.inscricaoInicio || meta.data_inscricao_inicio || existing?.data_inscricao_inicio,
    inscricaoFim: dates.inscricaoFim || meta.data_inscricao_fim || existing?.data_inscricao_fim,
    provaPrevista: dates.provaPrevista || meta.data_prova_prevista || existing?.data_prova_prevista,
  };

  await syncCronogramaEvents(editalId, combinedText || pdfText || '', cronogramaDates, link);

  await reportProgress(90, 'cronograma_processado');

  const hasParsedText = (combinedText || '').trim().length >= 200 || (pdfText || '').trim().length >= 200;
  const disciplinasValidas = (disciplinas || []).filter(
    (disc) => disc?.nome && !isDisallowedSyllabusItem(disc.nome) && !isGenericDisciplinaName(disc.nome)
  );
  const hasMaterias = disciplinasValidas.length > 0;
  const hasMateriasDetalhadas = hasConteudoProgramaticoData(conteudoProgramatico, disciplinasValidas);
  const hasEditalPdf = hasEditalAttachment(link, storedPdfs.arquivos);
  const ocrProcessedAt = pdfCandidate
    ? (pdfExtraction?.cached && pdfCacheEntry?.updated_at ? pdfCacheEntry.updated_at : new Date().toISOString())
    : undefined;
  await refreshEditalProcessingSteps(editalId, {
    collectedAt: item.created_at,
    hasEditalPdf,
    hasParsedText,
    hasMaterias,
    hasMateriasDetalhadas,
    ocrProcessedAt,
    ocrStatus: pdfExtraction?.ocr_status ?? (pdfCandidate ? 'falhou' : undefined),
    ocrMethod: pdfExtraction?.method ?? (pdfCandidate ? 'none' : undefined),
    ocrWords: pdfExtraction?.words ?? undefined,
    ocrUsed: pdfExtraction?.ocr_used ?? (pdfCandidate ? false : undefined),
  });

  await reportProgress(100, 'finalizado', { edital_id: editalId });

  return { editalId, created };
}
// ============================================
// COLETA AUTOMATICA
// ============================================

export async function harvestFromSource(
  sourceId: string,
  limit: number = 10,
  overrideConfig?: Partial<HarvestSourceConfig>,
  options?: { autoImport?: boolean; forceRefresh?: boolean }
): Promise<HarvestResult> {
  console.log(`[harvest] Iniciando coleta da fonte ${sourceId}`);

  await ensureHarvestSchema();
  const source = await resolveHarvestSource(sourceId, overrideConfig);
  if (!source.enabled) {
    throw new Error('Fonte desabilitada');
  }

  const result: HarvestResult = {
    success: true,
    harvested_count: 0,
    errors: [],
    contents: [],
  };

  const autoImport = options?.autoImport !== false;
  const forceRefresh = options?.forceRefresh === true;

  try {
    const urls = await discoverUrls(source, limit);

    for (const url of urls) {
      try {
        if (isJcConcursosSource(source, url) && isJcConcursosListPage(url)) {
          console.log(`[harvest] Ignorando listagem JC Concursos: ${url}`);
          continue;
        }

        if (!forceRefresh) {
          const existing = await query<{ id: string }>(
            'SELECT id FROM harvested_content WHERE source_id = $1 AND url = $2 LIMIT 1',
            [source.id, url]
          );
          if (existing.rows[0]?.id) {
            console.log(`[harvest] Ignorando URL ja coletada: ${url}`);
            continue;
          }
        }

        const isPdf = /\.pdf(\?|$)/i.test(url);
        let metadata: any = {};
        let rawHtml = '';
        let parsed: any = {};

        if (isPdf) {
          metadata = {
            title: extractTitleFromUrl(url) || 'PDF de edital',
            source: source.name,
            source_id: source.id,
            original_url: url,
          };
          parsed = { type: 'pdf', url };
        } else {
          const content = await fetchContent(url, source);
          rawHtml = (content.html || '').replace(/\u0000/g, '');
          metadata = content.metadata;
          parsed = await parseContent(rawHtml, source.type);
        }

        const harvestId = await saveHarvest({
          sourceId: source.id,
          url,
          title: metadata.title || 'Sem titulo',
          contentType: source.type,
          rawHtml,
          parsedContent: parsed,
          metadata,
        });

        result.harvested_count++;
        console.log(`[harvest] Conteudo ${harvestId} salvo`);
        if (result.harvested_count >= limit) {
          break;
        }

        if (autoImport && source.type === 'edital') {
          try {
            await importHarvestedToEdital(harvestId);
            console.log(`[harvest] Edital importado para ${harvestId}`);
          } catch (err) {
            console.error(`[harvest] Falha ao importar edital ${harvestId}:`, err);
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        result.errors.push(`${url}: ${errMsg}`);
        console.error(`[harvest] Erro em ${url}:`, err);
      }
    }
  } catch (err) {
    result.success = false;
    const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    result.errors.push(errMsg);
  }

  return result;
}

export async function harvestAll(
  limit: number = 10,
  options?: { autoImport?: boolean; forceRefresh?: boolean }
): Promise<{
  total_sources: number;
  total_harvested: number;
  results: Array<{ source_id: string; result: HarvestResult }>;
}> {
  await ensureHarvestSchema();
  console.log('[harvest] Iniciando coleta de todas as fontes');

  const sources = await getSources({ enabled: true });
  const results: Array<{ source_id: string; result: HarvestResult }> = [];
  let totalHarvested = 0;

  for (const source of sources) {
    try {
      const result = await harvestFromSource(source.id, limit, undefined, options);
      results.push({ source_id: source.id, result });
      totalHarvested += result.harvested_count;
    } catch (err) {
      console.error(`[harvest] Erro na fonte ${source.id}:`, err);
      results.push({
        source_id: source.id,
        result: {
          success: false,
          harvested_count: 0,
          errors: [err instanceof Error ? err.message : 'Erro desconhecido'],
          contents: [],
        },
      });
    }
  }

  return {
    total_sources: sources.length,
    total_harvested: totalHarvested,
    results,
  };
}

// ============================================
// BUSCAR CONTEUDO COLETADO
// ============================================

export async function getHarvestedContent(filters?: {
  sourceId?: string;
  contentType?: string;
  status?: string;
  limit?: number;
  includeRaw?: boolean;
}): Promise<HarvestContent[]> {
  await ensureHarvestSchema();

  const includeRaw = filters?.includeRaw === true;
  const selectFields = includeRaw
    ? 'hc.*'
    : `
      hc.id,
      hc.source_id,
      hc.url,
      hc.title,
      hc.content_type,
      hc.metadata,
      hc.status,
      hc.created_at
    `;

  let sql = `
    SELECT
      ${selectFields},
      hs.name AS source_name,
      hs.type AS source_type,
      hc.created_at AS harvested_at
    FROM harvested_content hc
    LEFT JOIN harvest_sources hs ON hs.id = hc.source_id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramCount = 1;

  if (filters?.sourceId) {
    sql += ` AND hc.source_id = $${paramCount++}`;
    params.push(filters.sourceId);
  }

  if (filters?.contentType) {
    sql += ` AND hc.content_type = $${paramCount++}`;
    params.push(filters.contentType);
  }

  if (filters?.status) {
    sql += ` AND hc.status = $${paramCount++}`;
    params.push(filters.status);
  }

  sql += ' ORDER BY hc.created_at DESC';

  if (filters?.limit) {
    sql += ` LIMIT $${paramCount++}`;
    params.push(filters.limit);
  }

  const { rows } = await query<HarvestContent>(sql, params);
  const editalIds = Array.from(
    new Set(
      rows
        .map((row) => {
          const meta = row.metadata as any;
          return meta?.edital_id && typeof meta.edital_id === 'string' ? meta.edital_id : null;
        })
        .filter(Boolean)
    )
  ) as string[];

  if (editalIds.length === 0) {
    return rows;
  }

  const { rows: editais } = await query<{ id: string; processing_steps: EditalProcessingSteps }>(
    'SELECT id, processing_steps FROM editais WHERE id = ANY($1)',
    [editalIds]
  );
  const stepsById = new Map(editais.map((edital) => [edital.id, edital.processing_steps]));

  return rows.map((row) => {
    const meta = row.metadata as any;
    const editalId = meta?.edital_id && typeof meta.edital_id === 'string' ? meta.edital_id : null;
    return {
      ...row,
      edital_id: editalId,
      processing_steps: editalId ? stepsById.get(editalId) ?? null : null,
    };
  });
}

export async function getHarvestedById(id: string): Promise<HarvestContent | null> {
  await ensureHarvestSchema();

  const { rows } = await query<HarvestContent>(
    `
      SELECT
        hc.*,
        hs.name AS source_name,
        hs.type AS source_type,
        hc.created_at AS harvested_at
      FROM harvested_content hc
      LEFT JOIN harvest_sources hs ON hs.id = hc.source_id
      WHERE hc.id = $1
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

export async function deleteHarvestedById(id: string): Promise<boolean> {
  await ensureHarvestSchema();
  const result = await query('DELETE FROM harvested_content WHERE id = $1 RETURNING id', [id]);
  return (result.rowCount || 0) > 0;
}

export async function clearHarvestedBySource(sourceId: string): Promise<number> {
  await ensureHarvestSchema();
  const { rows } = await query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM harvested_content WHERE source_id = $1',
    [sourceId]
  );
  const count = parseInt(rows[0]?.count ?? '0', 10);
  await query('DELETE FROM harvested_content WHERE source_id = $1', [sourceId]);
  return count;
}

export async function deleteSource(id: string): Promise<boolean> {
  await ensureHarvestSchema();
  await query('DELETE FROM harvested_content WHERE source_id = $1', [id]);
  const result = await query('DELETE FROM harvest_sources WHERE id = $1 RETURNING id', [id]);
  return (result.rowCount || 0) > 0;
}

// ============================================
// HELPERS - DISCOVERY E METADADOS
// ============================================

async function discoverUrls(source: HarvestSource, limit: number): Promise<string[]> {
  console.log(`[harvest] Descobrindo URLs da fonte ${source.name}`);

  const urls = new Set<string>();
  const seedTargets: string[] = [];
  const config = source.config || {};
  const candidateLimit = Math.max(limit * 5, limit);

  const seeds = [
    ...(Array.isArray(config.seed_urls) ? config.seed_urls : []),
    ...(Array.isArray(config.seedUrls) ? config.seedUrls : []),
    ...(Array.isArray(config.seeds) ? config.seeds : []),
    source.base_url,
  ];

  const sitemapUrls = [
    ...(Array.isArray(config.sitemap_urls) ? config.sitemap_urls : []),
    ...(Array.isArray(config.sitemapUrls) ? config.sitemapUrls : []),
  ];
  sitemapUrls.forEach((candidate) => addCandidateUrl(urls, candidate, source.base_url));

  const includePatterns = (config.linkPatterns || []).map((p) => new RegExp(p, 'i'));
  const bannedPatterns = (config.bannedPatterns || []).map((p) => new RegExp(p, 'i'));
  const urlIncludePatterns = (config.urlIncludePatterns || []).map((p) => new RegExp(p, 'i'));
  const urlExcludePatterns = (config.urlExcludePatterns || []).map((p) => new RegExp(p, 'i'));
  const allowedDomains = (config.allowedDomains || []).map((d) => d.toLowerCase());

  const shouldKeepUrl = (candidate: string, text?: string) => {
    if (allowedDomains.length) {
      try {
        const hostname = new URL(candidate).hostname.toLowerCase();
        if (!allowedDomains.some((domain) => hostname.includes(domain))) return false;
      } catch {
        return false;
      }
    }

    if (bannedPatterns.some((re) => re.test(candidate))) return false;
    if (urlExcludePatterns.some((re) => re.test(candidate))) return false;

    const urlMatches = includePatterns.length === 0 || includePatterns.some((re) => re.test(candidate));
    const explicitIncludes = urlIncludePatterns.length === 0 || urlIncludePatterns.some((re) => re.test(candidate));
    const hasTextIncludes = (config.textIncludePatterns || []).length > 0;
    const textMatches = !hasTextIncludes || !text || (config.textIncludePatterns || []).some((p) => new RegExp(p, 'i').test(text));
    const textRejected = text && (config.textExcludePatterns || []).some((p) => new RegExp(p, 'i').test(text));

    if (textRejected) return false;
    return urlMatches && explicitIncludes && textMatches;
  };

  if (Array.isArray(config.paths)) {
    config.paths.forEach((path) => {
      const normalized = normalizeUrl(path, source.base_url);
      if (!normalized) return;
      seedTargets.push(normalized);
      if (shouldKeepUrl(normalized)) urls.add(normalized);
    });
  }

  seeds.forEach((candidate) => {
    const normalized = normalizeUrl(candidate, source.base_url);
    if (!normalized) return;
    seedTargets.push(normalized);
    if (shouldKeepUrl(normalized)) urls.add(normalized);
  });

  for (const seed of seedTargets) {
    if (urls.size >= candidateLimit) break;
    const normalizedSeed = normalizeUrl(seed, source.base_url);
    if (!normalizedSeed) continue;

    try {
      const fetchUrl = isJcConcursosSource(source, normalizedSeed)
        ? toJinaUrl(normalizedSeed)
        : normalizedSeed;
      const html = await fetchHtml(fetchUrl);
      const $ = cheerio.load(html);
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text();
        const normalized = normalizeUrl(href, normalizedSeed);
        if (!normalized) return;
        if (!shouldKeepUrl(normalized, text)) return;
        urls.add(normalized);
      });
      $('[data-url], [data-href], [data-link]').each((_, el) => {
        const href = $(el).attr('data-url') || $(el).attr('data-href') || $(el).attr('data-link');
        const text = $(el).text();
        const normalized = normalizeUrl(href, normalizedSeed);
        if (!normalized) return;
        if (!shouldKeepUrl(normalized, text)) return;
        urls.add(normalized);
      });
      if (isJinaMarkdown(html)) {
        extractMarkdownLinks(html).forEach(({ text, url }) => {
          const normalized = normalizeUrl(url, normalizedSeed);
          if (!normalized) return;
          if (!shouldKeepUrl(normalized, text)) return;
          urls.add(normalized);
        });
      }
    } catch (err) {
      console.warn(`[harvest] Nao foi possivel ler seed ${normalizedSeed}:`, err);
    }
  }

  if (urls.size === 0) {
    const fallback = normalizeUrl(source.base_url, source.base_url);
    if (fallback && shouldKeepUrl(fallback)) {
      urls.add(fallback);
    }
  }

  const discovered = Array.from(urls).slice(0, candidateLimit);
  const filtered = isJcConcursosSource(source)
    ? discovered.filter((candidate) => !isJcConcursosListPage(candidate))
    : discovered;
  console.log(`[harvest] ${filtered.length} URLs detectadas para ${source.name}`);
  return filtered;
}

function extractMetadata(html: string, url?: string, source?: HarvestSource): any {
  const title = extractTitle(html) || extractTitleFromUrl(url || '');
  const metadata: any = {
    title,
    description: extractDescription(html),
    author: extractAuthor(html),
    date: new Date().toISOString(),
    url,
  };
  const jinaMeta = isJinaMarkdown(html) ? extractJinaMetadata(html) : {};
  const isJcConcursos = isJcConcursosSource(source, url);
  if (jinaMeta.title && (isJcConcursos || !metadata.title)) metadata.title = jinaMeta.title;
  if (jinaMeta.publishedTime) metadata.date = jinaMeta.publishedTime;
  if (jinaMeta.urlSource) metadata.url_source = jinaMeta.urlSource;

  if (source) {
    metadata.source = source.name;
    metadata.source_id = source.id;
  }

  let jcTags: Set<string> | null = null;

  if (isJcConcursos) {
    const $ = cheerio.load(html);
    jcTags = new Set(Array.isArray(metadata.tags) ? metadata.tags : []);

    let statusText = $('.status-concurso-interna, [class*="status-concurso"]')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim();
    if (!statusText && isJinaMarkdown(html)) {
      const normalized = normalizeSignalText(html);
      if (normalized.includes('previsto')) statusText = 'Previsto';
      else if (normalized.includes('autorizado')) statusText = 'Autorizado';
      else if (normalized.includes('inscricoes abertas') || normalized.includes('concursos abertos')) statusText = 'Inscricoes abertas';
      else if (normalized.includes('em andamento')) statusText = 'Em andamento';
      else if (normalized.includes('encerrado') || normalized.includes('concluido')) statusText = 'Encerrado';
      else if (normalized.includes('suspenso')) statusText = 'Suspenso';
      else if (normalized.includes('cancelado')) statusText = 'Cancelado';
    }
    if (statusText) {
      metadata.status_concurso = statusText;
      const normalized = normalizeSignalText(statusText);
      if (normalized.includes('previsto')) jcTags.add('previsto');
      if (normalized.includes('autorizado')) jcTags.add('autorizado');
      if (normalized.includes('aberto')) jcTags.add('aberto');
      if (normalized.includes('em andamento')) jcTags.add('em_andamento');
      if (normalized.includes('encerrado') || normalized.includes('concluido')) jcTags.add('concluido');
      if (normalized.includes('suspenso')) jcTags.add('suspenso');
      if (normalized.includes('cancelado')) jcTags.add('cancelado');
      const mappedStatus = mapJcStatusToEditalStatus(statusText);
      if (mappedStatus) metadata.status = mappedStatus;
    }

    const summary = extractJcConcursosSummary($, html);
    if (summary.orgao) metadata.orgao = summary.orgao;
    if (summary.numero_vagas !== undefined) metadata.numero_vagas = summary.numero_vagas;
    if (summary.taxa_inscricao) metadata.taxa_inscricao = summary.taxa_inscricao;
    if (summary.banca) metadata.banca = summary.banca;
    if (summary.localidade) metadata.localidade = summary.localidade;
    if (summary.faixa_salario) metadata.faixa_salario = summary.faixa_salario;
    if (Array.isArray(summary.cargos) && summary.cargos.length) {
      metadata.cargos = summary.cargos.map((nome: string) => ({ nome }));
    }
    if (Array.isArray(summary.areas) && summary.areas.length) metadata.areas = summary.areas;
    if (Array.isArray(summary.escolaridade) && summary.escolaridade.length) {
      metadata.escolaridade = summary.escolaridade;
    }

    if (isJinaMarkdown(html)) {
      const markdown = jinaMeta.markdown || html;
      const jcProgram = extractJcProgramFromMarkdown(markdown);
      if (jcProgram.disciplinas.length && (!Array.isArray(metadata.disciplinas) || metadata.disciplinas.length === 0)) {
        metadata.disciplinas = jcProgram.disciplinas;
      }
      if (Object.keys(jcProgram.conteudo_programatico).length && (!metadata.conteudo_programatico || Object.keys(metadata.conteudo_programatico).length === 0)) {
        metadata.conteudo_programatico = jcProgram.conteudo_programatico;
      }
    }
  }

  const linkSection = extractLinkSectionLinks(html, url);
  const pdfLinks = mergePdfLinks(linkSection.pdfLinks, extractPdfLinks(html, url));
  const bestPdf = pickBestPdfLink(pdfLinks);
  if (pdfLinks.length) {
    metadata.pdf_links = pdfLinks.map((link) => ({
      url: link.url,
      label: link.label,
      kind: link.kind,
      score: link.score,
    }));
  }
  if (bestPdf?.url) {
    metadata.original_url = bestPdf.url;
    metadata.edital_url = bestPdf.url;
  }
  if (linkSection.provasUrl) {
    metadata.provas_url = linkSection.provasUrl;
  }

  if (jcTags) {
    if (!metadata.edital_url) {
      jcTags.add('sem_edital');
    }
    if (jcTags.size) {
      metadata.tags = Array.from(jcTags);
    }
  }

  return metadata;
}

function extractPdfLink(html: string, baseUrl?: string): string | undefined {
  const links = extractPdfLinks(html, baseUrl);
  const best = pickBestPdfLink(links);
  return best?.url;
}

function extractTitle(html: string): string {
  const ogMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogMatch) return ogMatch[1].trim();
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function extractTitleFromUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || parsed.hostname;
    return decodeURIComponent(last.replace(/[-_]/g, ' ')).trim();
  } catch {
    return url;
  }
}

function extractDescription(html: string): string {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (match) return match[1].trim();
  const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  return ogMatch ? ogMatch[1].trim() : '';
}

function extractAuthor(html: string): string {
  const match = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i);
  return match ? match[1].trim() : '';
}

function extractText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractArticleBody(html: string): string {
  const match = html.match(/itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/article>/i);
  if (!match) return '';
  return extractTextWithBreaks(match[1]);
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const regex = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    headings.push(match[1].trim());
  }

  return headings;
}

function extractLinks(html: string): string[] {
  const links: string[] = [];
  const regex = /<a[^>]*href=["']([^"']+)["']/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    links.push(match[1]);
  }

  return links;
}

function extractImages(html: string): string[] {
  const images: string[] = [];
  const regex = /<img[^>]*src=["']([^"']+)["']/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    images.push(match[1]);
  }

  return images;
}

function extractSections(html: string): any[] {
  const sections: any[] = [];
  return sections;
}

function extractQuestions(html: string): any[] {
  const questions: any[] = [];
  return questions;
}

function addCandidateUrl(store: Set<string>, candidate?: string, base?: string) {
  const normalized = normalizeUrl(candidate, base);
  if (normalized) {
    store.add(normalized);
  }
}

function normalizeUrl(input?: string, base?: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).toString();
  } catch {
    if (!base) return null;
    try {
      return new URL(trimmed, ensureBaseUrl(base)).toString();
    } catch {
      return null;
    }
  }
}

function ensureBaseUrl(base: string): string {
  try {
    const parsed = new URL(base);
    return parsed.toString();
  } catch {
    throw new Error(`Base URL invalida: ${base}`);
  }
}

function mapHarvestSource(
  row: HarvestSource & {
    config?: any;
    items_harvested?: number | null;
    last_run?: Date | string | null;
    runtime_status?: string | null;
  }
): HarvestSource {
  return {
    ...row,
    config: normalizeSourceConfig(row.config),
    items_harvested: toNumber(row.items_harvested),
    last_run: row.last_run ? new Date(row.last_run).toISOString() : null,
    status: (row as any).runtime_status ?? undefined,
  };
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeSourceConfig(raw: any): HarvestSourceConfig | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  if (typeof raw === 'object') {
    return raw as HarvestSourceConfig;
  }
  return undefined;
}

// ============================================
// EXPORTACAO
// ============================================

export const HarvestService = {
  getSources,
  getSourceById,
  addSource,
  updateSource,
  fetchContent,
  parseContent,
  saveHarvest,
  importHarvestedToEdital,
  harvestFromSource,
  harvestAll,
  getHarvestedContent,
  getHarvestedById,
  refreshEditalProcessingSteps,
  deleteHarvestedById,
  clearHarvestedBySource,
  deleteSource,
};

export default HarvestService;

