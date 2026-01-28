import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractText(mime: string, buffer: Buffer): Promise<string> {
  const lower = (mime || '').toLowerCase();

  if (lower.includes('pdf')) {
    const result = await pdf(buffer);
    return normalize(result.text || '');
  }

  if (lower.includes('word') || lower.includes('docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return normalize(result.value || '');
  }

  if (lower.includes('text') || lower.includes('markdown')) {
    return normalize(buffer.toString('utf8'));
  }

  if (lower.includes('presentation') || lower.includes('pptx')) {
    return normalize('[PPTX] Extractor not configured.');
  }

  return normalize('[File] Unsupported type for extraction.');
}

export function normalize(text: string) {
  return (text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
