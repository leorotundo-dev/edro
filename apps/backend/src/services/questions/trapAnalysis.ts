type TrapSignal = {
  type: string;
  term: string;
  message: string;
};

export type TrapAnalysis = {
  board: string;
  has_trap: boolean;
  summary: string;
  note: string;
  signals: TrapSignal[];
};

type Rule = {
  type: string;
  terms: string[];
  message: string;
};

const DEFAULT_BOARD = 'CEBRASPE';

const RULES: Rule[] = [
  {
    type: 'absolutismo',
    terms: [
      'sempre',
      'nunca',
      'jamais',
      'apenas',
      'somente',
      'exclusivamente',
      'totalmente',
      'qualquer',
      'todo',
      'toda',
      'todos',
      'nenhum',
      'nenhuma',
      'obrigatoriamente',
      'necessariamente',
      'invariavelmente',
    ],
    message: 'Termos absolutos costumam esconder excecoes ou condicoes.',
  },
  {
    type: 'modalidade',
    terms: [
      'pode',
      'deve',
      'devera',
      'deverao',
      'e permitido',
      'e obrigatorio',
      'e vedado',
      'proibido',
      'facultativo',
      'dispensado',
      'necessario',
    ],
    message: 'A banca troca permissao por obrigacao/vedacao.',
  },
  {
    type: 'excecao',
    terms: [
      'salvo',
      'exceto',
      'ressalv',
      'a nao ser',
      'desde que',
      'na hipotese',
      'quando',
      'se',
      'caso',
      'em regra',
      'via de regra',
    ],
    message: 'Procure a excecao ou a condicao do enunciado.',
  },
  {
    type: 'tempo',
    terms: [
      'antes',
      'depois',
      'imediatamente',
      'prazo',
      'ate',
      'posterior',
      'anterior',
      'durante',
    ],
    message: 'A pegadinha costuma estar na ordem ou no prazo.',
  },
  {
    type: 'competencia',
    terms: [
      'compete',
      'competencia',
      'atribuicao',
      'atribui',
      'incumbe',
      'responsavel',
      'titular',
      'autoridade',
      'orgao',
    ],
    message: 'Verifique se o orgao ou agente competente foi trocado.',
  },
];

const normalizeText = (value?: string | null) => (value || '').toString().toLowerCase();

const matchTerm = (text: string, term: string) => {
  if (!term) return false;
  if (term.includes(' ')) {
    return text.includes(term);
  }
  return new RegExp(`\\b${term}\\b`, 'i').test(text);
};

const detectSignals = (text: string): TrapSignal[] => {
  const found: TrapSignal[] = [];
  const seen = new Set<string>();
  const normalized = normalizeText(text);
  if (!normalized) return found;

  for (const rule of RULES) {
    for (const term of rule.terms) {
      if (!matchTerm(normalized, term)) continue;
      const key = `${rule.type}:${term}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ type: rule.type, term, message: rule.message });
    }
  }

  const hasMultipleStatements =
    normalized.split(';').length > 1 || normalized.split('.').length > 2;
  if (hasMultipleStatements) {
    found.push({
      type: 'mistura',
      term: 'varios trechos',
      message: 'A banca costuma misturar um trecho correto com um detalhe errado.',
    });
  }

  return found;
};

const resolveBoardLabel = (value?: string | null) => {
  const normalized = normalizeText(value);
  if (!normalized) return DEFAULT_BOARD;
  if (normalized.includes('cebraspe') || normalized.includes('cespe')) return 'CEBRASPE';
  if (normalized.includes('fgv')) return 'FGV';
  if (normalized.includes('fcc')) return 'FCC';
  if (normalized.includes('vunesp')) return 'VUNESP';
  return value || DEFAULT_BOARD;
};

export function analyzeQuestionTrap(params: {
  questionText?: string | null;
  explanation?: string | null;
  examBoard?: string | null;
}): TrapAnalysis {
  const text = `${params.questionText || ''} ${params.explanation || ''}`.trim();
  const board = resolveBoardLabel(params.examBoard);
  const signals = detectSignals(text);
  const hasTrap = signals.length > 0;

  const summary = hasTrap
    ? 'A pegadinha costuma estar nos termos absolutos, excecoes ou troca de modalidade.'
    : 'Nao foi identificado sinal claro. Revise termos tecnicos e condicoes do enunciado.';

  const note =
    board === 'CEBRASPE'
      ? 'Na CEBRASPE, um detalhe errado torna o item inteiro errado.'
      : 'Procure sempre o detalhe que muda o sentido da afirmacao.';

  return {
    board,
    has_trap: hasTrap,
    summary,
    note,
    signals,
  };
}
