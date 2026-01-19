import { DropContent } from '@/types';

export type DropTextValue = DropContent | string | null | undefined;

const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatInlineText = (value: string) =>
  value
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>');

const splitLongParagraph = (text: string) => {
  if (text.length < 420) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let buffer = '';
  let sentenceCount = 0;

  sentences.forEach((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (buffer.length + trimmed.length > 420 || sentenceCount >= 3) {
      if (buffer) chunks.push(buffer.trim());
      buffer = trimmed;
      sentenceCount = 1;
      return;
    }
    buffer = buffer ? `${buffer} ${trimmed}` : trimmed;
    sentenceCount += 1;
  });

  if (buffer) chunks.push(buffer.trim());
  return chunks.length ? chunks : [text];
};

const formatDropText = (rawText: string) => {
  if (!rawText) return '';
  if (HTML_TAG_REGEX.test(rawText)) return rawText;

  const escaped = escapeHtml(rawText);
  const lines = escaped.split(/\r?\n/);
  const blocks: string[] = [];
  let paragraph = '';
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.trim()) return;
    splitLongParagraph(paragraph.trim()).forEach((chunk) => {
      blocks.push(`<p class="mb-4 text-text-main leading-relaxed">${formatInlineText(chunk)}</p>`);
    });
    paragraph = '';
  };

  const flushList = () => {
    if (!listItems.length || !listType) return;
    const items = listItems.map((item) => `<li class="text-text-main">${formatInlineText(item)}</li>`).join('');
    const listClass =
      listType === 'ol'
        ? 'mb-4 list-decimal space-y-2 pl-5'
        : 'mb-4 list-disc space-y-2 pl-5';
    blocks.push(`<${listType} class="${listClass}">${items}</${listType}>`);
    listItems = [];
    listType = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = trimmed.match(/^(#{2,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length === 2 ? 'h3' : 'h4';
      const headingClass = level === 'h3'
        ? 'mt-6 mb-3 text-xl font-semibold font-title text-text-main'
        : 'mt-4 mb-2 text-base font-semibold font-title text-text-main';
      blocks.push(`<${level} class="${headingClass}">${formatInlineText(headingMatch[2])}</${level}>`);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+[\.\)]\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(orderedMatch[1]);
      return;
    }

    const bulletMatch = trimmed.match(/^[-•]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(bulletMatch[1]);
      return;
    }

    if (trimmed.endsWith(':') && trimmed.length <= 64) {
      flushParagraph();
      flushList();
      blocks.push(`<h4 class="mt-4 mb-2 text-base font-semibold font-title text-text-main">${formatInlineText(trimmed)}</h4>`);
      return;
    }

    if (listItems.length) flushList();
    paragraph = paragraph ? `${paragraph} ${trimmed}` : trimmed;
  });

  flushParagraph();
  flushList();

  return blocks.join('\n');
};

const extractContentFromJson = (raw: string): string | null => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const text = String(parsed.text || parsed.conteudo || parsed.content || '').trim();
      return text || null;
    }
  } catch {
    return null;
  }
  return null;
};

export function parseDropContent(value: DropTextValue, fallbackText?: string): DropContent {
  if (!value) {
    const fallback = fallbackText ? extractContentFromJson(fallbackText) || fallbackText : '';
    return { text: formatDropText(fallback || '') };
  }

  if (typeof value === 'string') {
    const extracted = extractContentFromJson(value);
    if (extracted) {
      return { text: formatDropText(extracted) };
    }
    return { text: formatDropText(value || fallbackText || '') };
  }

  if (typeof value === 'object') {
    const parsed = value as DropContent;
    return {
      ...parsed,
      text: formatDropText(parsed.text || ''),
    };
  }

  return { text: formatDropText(fallbackText || '') };
}
