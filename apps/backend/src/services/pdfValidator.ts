import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import pdfParse from 'pdf-parse';

export interface PdfValidationResult {
  isValid: boolean;
  reason?: string;
  textSample?: string;
  classification?: PdfClassification;
}

export type PdfClassification =
  | 'edital'
  | 'retificacao'
  | 'resultado'
  | 'gabarito'
  | 'convocacao'
  | 'anexo'
  | 'outro';

const VALID_KEYWORDS = [
  'edital de abertura',
  'edital normativo',
  'concurso publico',
  'processo seletivo',
  'edital n'
];

const INVALID_KEYWORDS = [
  'resultado final',
  'gabarito',
  'retificacao',
  'convocacao',
  'homologacao',
  'classificacao final',
  'anexo',
  'comunicado'
];

const CLASSIFICATION_RULES: Array<{ type: PdfClassification; keywords: string[] }> = [
  { type: 'retificacao', keywords: ['retificacao', 'errata', 'retifica'] },
  { type: 'resultado', keywords: ['resultado final', 'resultado preliminar', 'resultado definitivo', 'classificacao final'] },
  { type: 'gabarito', keywords: ['gabarito', 'respostas preliminares', 'resposta preliminar'] },
  { type: 'convocacao', keywords: ['convocacao', 'nomeacao', 'posse', 'chamamento'] },
  { type: 'anexo', keywords: ['anexo', 'anexos'] },
  { type: 'edital', keywords: VALID_KEYWORDS },
];

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[^\x00-\x7F]+/g, '')
    .toLowerCase();
}

export function classifyPdfText(text: string): PdfClassification {
  const normalized = normalizeText(text || '');
  if (!normalized) return 'outro';

  for (const rule of CLASSIFICATION_RULES) {
    const matched = rule.keywords.some(kw => normalized.includes(normalizeText(kw)));
    if (matched) {
      return rule.type;
    }
  }

  return 'outro';
}

export async function validatePdfUrl(pdfUrl: string): Promise<PdfValidationResult> {
  const tmpFile = path.join(process.cwd(), 'tmp-pdf-' + Date.now() + '.pdf');

  try {
    await downloadFile(pdfUrl, tmpFile);
    const buffer = fs.readFileSync(tmpFile);
    const parsed = await pdfParse(buffer, { max: 1 });
    const text = (parsed.text || '').slice(0, 4000);
    const normalized = normalizeText(text);
    const classification = classifyPdfText(text);

    const hasValid = VALID_KEYWORDS.some(kw => normalized.includes(normalizeText(kw)));
    const hasInvalid = INVALID_KEYWORDS.some(kw => normalized.includes(normalizeText(kw)));

    if (!hasValid || hasInvalid) {
      return {
        isValid: false,
        reason: 'PDF nao parece ser edital de abertura',
        textSample: normalized.slice(0, 500),
        classification
      };
    }

    return { isValid: true, textSample: normalized.slice(0, 500), classification };
  } catch (err: any) {
    return { isValid: false, reason: err?.message || 'Falha ao validar PDF' };
  } finally {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);

    const req = client.get(url, res => {
      if (res.statusCode && res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    req.on('error', err => {
      fs.unlink(dest, () => reject(err));
    });
  });
}
