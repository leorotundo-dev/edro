/**
 * trelloCardMapper.ts — single source of truth for Trello card normalization.
 *
 * All consumers (ops-feed, getProjectCardAsJob, planners, Jarvis tools) must
 * use these helpers so title cleaning, label and attachment formatting happen
 * in ONE place and are never duplicated inline.
 */

// ── Trello label color → CSS hex ─────────────────────────────────────────────
export const TRELLO_LABEL_COLORS: Record<string, string> = {
  yellow:     '#F2D600',
  yellow_dark:'#D6A800',
  orange:     '#FF9F1A',
  orange_dark:'#E06000',
  red:        '#EB5A46',
  red_dark:   '#B04632',
  pink:       '#FF78CB',
  pink_dark:  '#C9558F',
  purple:     '#C377E0',
  purple_dark:'#89609E',
  blue:       '#0079BF',
  blue_dark:  '#055A8C',
  sky:        '#00C2E0',
  sky_dark:   '#0098B7',
  lime:       '#51E898',
  lime_dark:  '#4BBF6B',
  green:      '#61BD4F',
  green_dark: '#3F7A23',
  black:      '#344563',
  null:       '#B3BEC4', // label with color=null → grey
};

export type TrelloLabel = { color: string | null; name: string; hex?: string };

export type TrelloAttachment = {
  url: string;
  name: string;
  type?: string | null;
  preview_url?: string | null;
  is_image?: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-_]/g, '');
}

// ── stripTrelloTitle ──────────────────────────────────────────────────────────
/**
 * Strips the operational Trello prefix from a card title.
 *
 * Trello titles follow the pattern: DDMMYY_ClientName_Job_RealTitle
 * This function removes:
 *   1. Leading date stamp:  /^\d{6,8}_/   (e.g. "170426_")
 *   2. Client name segment: first `_`-delimited token that fuzzy-matches clientName
 *   3. Literal "Job_" prefix that sometimes remains after step 2
 *
 * Identical logic lives in the frontend cleanJobTitle() — this is the backend
 * canonical version; the frontend version should be kept in sync.
 */
export function stripTrelloTitle(title: string, clientName?: string | null): string {
  // 1. Strip date prefix
  let t = title.replace(/^\d{6,8}_/, '').trim();

  // 2. Strip client name prefix
  if (clientName) {
    const parts = t.split('_');
    if (parts.length > 1) {
      const n1 = normalizeName(parts[0]);
      const n2 = normalizeName(clientName);
      if (n1.length >= 3 && (n1 === n2 || n2.startsWith(n1) || n1.startsWith(n2))) {
        t = parts.slice(1).join('_').trim();
      }
    }
  }

  // 3. Strip lingering "Job_" prefix (common in multi-prefix titles)
  t = t.replace(/^Job_/i, '').trim();

  return t || title; // never return empty string
}

// ── normalizeTrelloLabels ─────────────────────────────────────────────────────
/**
 * Normalizes raw Trello labels JSON into a clean, typed array.
 * Adds `hex` for direct use in color chips.
 */
export function normalizeTrelloLabels(raw: unknown): TrelloLabel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l: any) => l && (l.name || l.color))
    .map((l: any) => {
      const colorKey = String(l.color ?? 'null');
      return {
        color: l.color ?? null,
        name: String(l.name ?? ''),
        hex: TRELLO_LABEL_COLORS[colorKey] ?? TRELLO_LABEL_COLORS['null'],
      };
    });
}

// ── normalizeTrelloAttachments ────────────────────────────────────────────────
/**
 * Normalizes raw Trello attachments JSON into a clean, typed array.
 */
export function normalizeTrelloAttachments(raw: unknown): TrelloAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a: any) => a && (a.url || a.file_url))
    .map((a: any) => {
      const url: string = a.url || a.file_url || '';
      const name: string = a.name || a.file_name || 'Anexo';
      const mimeType: string | null = a.mimeType || a.type || a.mime_type || null;
      const isImage = Boolean(
        (mimeType && /^image\//i.test(mimeType)) ||
        /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url)
      );
      return {
        url,
        name,
        type: mimeType ?? undefined,
        preview_url: a.previews?.[0]?.url ?? a.preview_url ?? (isImage ? url : null),
        is_image: isImage,
      };
    });
}

// ── inferJobType ──────────────────────────────────────────────────────────────
/**
 * Infers a job_type string from Trello label names.
 * Single source of truth — replaces repeated regex blocks in ops-feed.
 */
export function inferJobTypeFromLabels(labels: TrelloLabel[]): string {
  const text = labels.map((l) => (l.name ?? '').toLowerCase()).join(' ');
  if (/design|arte|artes|visual|criativo/.test(text)) return 'design_static';
  if (/video|vídeo|reels|stories/.test(text)) return 'video_edit';
  if (/reunião|reunion|meeting/.test(text)) return 'meeting';
  return 'copy';
}
