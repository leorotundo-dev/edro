import crypto from 'crypto';

export function makeHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function makeDropCacheKey(blueprintId: number, topicCode: string): string {
  const raw = `blueprint:${blueprintId}|topic:${topicCode}`;
  return makeHash(raw);
}
