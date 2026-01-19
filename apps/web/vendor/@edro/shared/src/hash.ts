import crypto from 'crypto';

/**
 * Gera um hash SHA-256 em formato hex.
 * Útil para chaves de cache baseadas em combinações estáveis
 * (ex.: blueprint_id + topic_code + parâmetros).
 */
export function makeHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Helper específico para cache de drops.
 * Exemplo de chave: "blueprint:{blueprintId}|topic:{topicCode}"
 */
export function makeDropCacheKey(blueprintId: number, topicCode: string): string {
  const raw = `blueprint:${blueprintId}|topic:${topicCode}`;
  return makeHash(raw);
}
