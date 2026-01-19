"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DROP_TYPE_TO_ESTIMATED_TIME = exports.DROP_TYPE_TO_COGNITIVE_LEVEL = void 0;
/**
 * Mapeamento de tipo de drop para nível cognitivo padrão
 */
exports.DROP_TYPE_TO_COGNITIVE_LEVEL = {
    'fundamento': 'understand',
    'regra': 'remember',
    'excecao': 'analyze',
    'pattern-banca': 'apply',
    'mini-questao': 'apply',
    'comparativo': 'analyze',
    'revisao': 'remember',
    'aprofundamento': 'evaluate',
    'explanation': 'understand',
    'mini_question': 'apply',
    'flashcard': 'remember'
};
/**
 * Mapeamento de tipo de drop para tempo estimado (segundos)
 */
exports.DROP_TYPE_TO_ESTIMATED_TIME = {
    'fundamento': 120, // 2 minutos
    'regra': 90, // 1.5 minutos
    'excecao': 150, // 2.5 minutos
    'pattern-banca': 180, // 3 minutos
    'mini-questao': 120, // 2 minutos
    'comparativo': 180, // 3 minutos
    'revisao': 60, // 1 minuto
    'aprofundamento': 300, // 5 minutos
    'explanation': 120,
    'mini_question': 120,
    'flashcard': 30 // 30 segundos
};
