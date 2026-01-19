"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeHash = makeHash;
exports.makeDropCacheKey = makeDropCacheKey;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Gera um hash SHA-256 em formato hex.
 * Útil para chaves de cache baseadas em combinações estáveis
 * (ex.: blueprint_id + topic_code + parâmetros).
 */
function makeHash(input) {
    return crypto_1.default.createHash('sha256').update(input).digest('hex');
}
/**
 * Helper específico para cache de drops.
 * Exemplo de chave: "blueprint:{blueprintId}|topic:{topicCode}"
 */
function makeDropCacheKey(blueprintId, topicCode) {
    const raw = `blueprint:${blueprintId}|topic:${topicCode}`;
    return makeHash(raw);
}
