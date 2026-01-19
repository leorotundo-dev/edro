import { Drop, updateDropOriginMeta } from '../repositories/dropRepository';
import { getMnemonicosBySubtopicoInsensitive } from '../repositories/mnemonicRepository';
import { MnemonicService, TECNICAS_MNEMONICAS, createMnemonico } from './mnemonicService';
import { generateSimplification } from './ai/openaiService';

type SimplifyMethod = '1-3-1' | 'contraste' | 'analogia' | 'historia' | 'mapa_mental';

const DEFAULT_SIMPLIFY_METHODS: SimplifyMethod[] = [
  '1-3-1',
  'contraste',
  'analogia',
  'historia',
  'mapa_mental',
];

const MAX_BASE_TEXT = 1200;
const MIN_MNEMONICS = 1;
const MAX_MNEMONICS = 4;

const normalizeText = (value?: string | null) => {
  const trimmed = String(value || '').trim();
  return trimmed || null;
};

const uniqueList = (items: string[]) => {
  const seen = new Set<string>();
  const output: string[] = [];
  items.forEach((item) => {
    const value = normalizeText(item);
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(value);
  });
  return output;
};

const parseJsonMaybe = (value: any) => {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    return null;
  }
  return null;
};

const resolveNivelFromDifficulty = (difficulty?: number): 'N1' | 'N2' | 'N3' | 'N4' | 'N5' => {
  const level = Math.min(5, Math.max(1, Math.round(difficulty || 1)));
  return (`N${level}` as 'N1' | 'N2' | 'N3' | 'N4' | 'N5');
};

function extractBaseText(drop: Drop): string {
  const dropTextPayload = typeof drop.drop_text === 'string'
    ? parseJsonMaybe(drop.drop_text)
    : (drop.drop_text && typeof drop.drop_text === 'object' ? drop.drop_text : null);
  const textFromDropText = normalizeText(dropTextPayload?.text as string | undefined);
  const textFromContentPayload = parseJsonMaybe(drop.content);
  const textFromContent = normalizeText(
    textFromContentPayload?.conteudo || textFromContentPayload?.content || textFromContentPayload?.text
  );
  const contentRaw = textFromDropText || textFromContent || normalizeText(drop.content) || '';
  const examples = Array.isArray(dropTextPayload?.examples) ? dropTextPayload.examples.join('\n') : '';
  const hints = Array.isArray(dropTextPayload?.hints) ? dropTextPayload.hints.join('\n') : '';
  const parts = [drop.title, contentRaw, examples, hints].filter(Boolean);
  const merged = parts.join('\n');
  return merged.length > MAX_BASE_TEXT ? `${merged.slice(0, MAX_BASE_TEXT)}...` : merged;
}

function resolveSubtopico(drop: Drop): string | null {
  const meta = drop.origin_meta || {};
  const metaSubtopico = normalizeText(
    meta.subtopico || meta.subtopic || meta.topic_name || meta.topicName || meta.sub_topico
  );
  if (metaSubtopico) return metaSubtopico;

  const contentPayload = parseJsonMaybe(drop.content);
  const contentSubtopico = normalizeText(
    contentPayload?.subtopico || contentPayload?.topic_name || contentPayload?.topicName
  );
  if (contentSubtopico) return contentSubtopico;

  if (drop.topic_code && drop.topic_code.includes('::')) {
    const pieces = drop.topic_code.split('::').map((part) => part.trim()).filter(Boolean);
    if (pieces.length > 0) return pieces[pieces.length - 1];
  }

  return normalizeText(drop.title);
}

function resolveBanca(drop: Drop): string | undefined {
  const meta = drop.origin_meta || {};
  const banca = normalizeText(meta.banca || meta.exam_board || meta.banca_nome);
  return banca || undefined;
}

function selectMnemonicTechniques(drop: Drop, baseText: string, existingTechniques: string[] = []): string[] {
  const difficulty = Math.min(5, Math.max(1, Math.round(drop.difficulty || 1)));
  const techniques: string[] = [];

  if (drop.drop_type === 'mini-questao') {
    techniques.push(TECNICAS_MNEMONICAS.TURBO);
  }

  if (difficulty >= 4) {
    techniques.push(TECNICAS_MNEMONICAS.ASSOCIACAO_ABSURDA, TECNICAS_MNEMONICAS.LOCI);
  } else if (difficulty <= 2) {
    techniques.push(TECNICAS_MNEMONICAS.IMAGEM, TECNICAS_MNEMONICAS.RIMA);
  }

  if (baseText.length > 500) {
    techniques.push(TECNICAS_MNEMONICAS.UM_TRES_UM, TECNICAS_MNEMONICAS.CHUNKING);
  }

  techniques.push(
    TECNICAS_MNEMONICAS.PALAVRA_CHAVE,
    TECNICAS_MNEMONICAS.ACRONIMO,
    TECNICAS_MNEMONICAS.HISTORIA,
    TECNICAS_MNEMONICAS.SUBSTITUICAO,
    TECNICAS_MNEMONICAS.EMOCAO
  );

  const filtered = uniqueList(techniques).filter((item) => !existingTechniques.includes(item));
  return filtered.length ? filtered : uniqueList(techniques);
}

async function loadMnemonicsByCandidates(candidates: string[]) {
  const results: any[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const items = await getMnemonicosBySubtopicoInsensitive(candidate);
    items.forEach((item) => {
      if (!item?.id || seen.has(item.id)) return;
      seen.add(item.id);
      results.push(item);
    });
  }
  return results;
}

export async function getDropAids(params: {
  drop: Drop;
  userId: string;
  autoGenerate?: boolean;
  simplifyMethods?: SimplifyMethod[];
  mnemonicLimit?: number;
}) {
  const autoGenerate = params.autoGenerate !== false;
  const simplifyMethods = params.simplifyMethods || DEFAULT_SIMPLIFY_METHODS;
  const baseText = extractBaseText(params.drop);
  const fallbackSubtopico =
    resolveSubtopico(params.drop) || normalizeText(params.drop.title) || 'Conteudo do edital';
  const subtopico = fallbackSubtopico;
  const baseTextSafe = baseText || fallbackSubtopico;
  const banca = resolveBanca(params.drop);
  const nivel = resolveNivelFromDifficulty(params.drop.difficulty);
  const meta = params.drop.origin_meta || {};

  const candidates = uniqueList([
    subtopico || '',
    params.drop.topic_code || '',
    params.drop.title || '',
    meta.topic_name || '',
    meta.subtopico || '',
  ]);

  let mnemonics = candidates.length ? await loadMnemonicsByCandidates(candidates) : [];
  mnemonics = mnemonics.filter((item: any) => {
    const texto = normalizeText(item?.texto_principal);
    return texto && texto.length >= 6;
  });
  const mnemonicLimit = params.mnemonicLimit && params.mnemonicLimit > 0
    ? Math.min(params.mnemonicLimit, MAX_MNEMONICS)
    : MAX_MNEMONICS;
  mnemonics = mnemonics.slice(0, mnemonicLimit);

  let mnemonicsGenerated = false;
  let mnemonicsFallback = false;

  if (autoGenerate && subtopico && baseTextSafe && mnemonics.length < MIN_MNEMONICS) {
    const existingTechniques = uniqueList(
      mnemonics.map((item: any) => String(item?.tecnica || '').toLowerCase()).filter(Boolean)
    );
    const techniques = selectMnemonicTechniques(params.drop, baseTextSafe, existingTechniques)
      .slice(0, Math.max(0, MIN_MNEMONICS - mnemonics.length));
    const generated: any[] = [];

    for (const tecnica of techniques) {
      try {
        const mnemonicoId = await MnemonicService.generateMnemonic({
          subtopico,
          conteudo: baseTextSafe,
          tecnica,
          disciplina_id: params.drop.discipline_id,
          banca,
          variacoes: 2,
        });
        await MnemonicService.addToUser(params.userId, mnemonicoId);
        const created = await MnemonicService.getMnemonico(mnemonicoId);
        if (created) generated.push(created);
      } catch (err) {
        console.warn('[drop-aids] mnemonic generation failed', err);
      }
    }

    if (generated.length > 0) {
      mnemonicsGenerated = true;
      mnemonics = [...mnemonics, ...generated].slice(0, mnemonicLimit);
    }
  }

  if (autoGenerate && mnemonics.length === 0 && subtopico) {
    try {
      const fallbackId = await createMnemonico({
        tecnica: TECNICAS_MNEMONICAS.ACRONIMO,
        texto_principal: subtopico,
        explicacao: `Mnemonico rapido para lembrar: ${subtopico}`,
        subtopico,
        disciplina_id: params.drop.discipline_id,
        banca,
        nivel_dificuldade: params.drop.difficulty,
        criado_por: 'Sistema',
        forca_memoria: 0.4,
        versao: 'v1.0',
      });
      await MnemonicService.addToUser(params.userId, fallbackId);
      const created = await MnemonicService.getMnemonico(fallbackId);
      if (created) {
        mnemonics = [created];
        mnemonicsFallback = true;
      }
    } catch (err) {
      console.warn('[drop-aids] fallback mnemonic failed', err);
    }
  }

  const existingSimplifications =
    meta && typeof meta.simplifications === 'object' ? { ...meta.simplifications } : {};
  const missingMethods = simplifyMethods.filter((method) => !existingSimplifications?.[method]);
  const simplifications: Record<string, string> = { ...existingSimplifications };
  let simplificationsGenerated = false;

  if (autoGenerate && baseText && missingMethods.length > 0) {
    for (const method of missingMethods) {
      try {
        const output = await generateSimplification({
          texto: baseText,
          metodo: method,
          banca,
          nivel,
        });
        if (output) {
          simplifications[method] = output;
        }
      } catch (err) {
        console.warn('[drop-aids] simplification failed', err);
      }
    }

    if (missingMethods.some((method) => simplifications[method])) {
      simplificationsGenerated = true;
      const nextMeta = {
        ...meta,
        simplifications,
        simplifications_generated_at: new Date().toISOString(),
      };
      await updateDropOriginMeta({ id: params.drop.id, origin_meta: nextMeta });
    }
  }

  return {
    topic: {
      subtopico,
      banca,
    },
    mnemonics,
    simplifications,
    generated: {
      mnemonics: mnemonicsGenerated,
      simplifications: simplificationsGenerated,
    },
    status: {
      mnemonics: {
        count: mnemonics.length,
        generated: mnemonicsGenerated,
        fallback: mnemonicsFallback,
        min_required: MIN_MNEMONICS,
      },
      simplifications: {
        count: Object.keys(simplifications).length,
        generated: simplificationsGenerated,
      },
    },
  };
}

export default {
  getDropAids,
};
