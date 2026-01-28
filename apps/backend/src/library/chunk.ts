import crypto from 'crypto';

export function sha256(text: string) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export function chunkText(text: string, target = 1100, min = 450) {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const para of paras) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= target) {
      current = candidate;
    } else {
      if (current.length >= min) {
        chunks.push(current);
      }
      current = para;
    }
  }

  if (current && current.length >= 50) {
    chunks.push(current);
  }

  if (!chunks.length && text.length) {
    chunks.push(text.slice(0, target));
  }

  return chunks;
}
