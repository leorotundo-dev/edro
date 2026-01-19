import { query } from '../db';
import { editalRepository } from '../repositories/editalRepository';
import { QuestionRepository } from '../repositories/questionRepository';
import { generateAutoFormacao } from './autoFormacaoService';
import { generateQuestionBatch } from './ai/questionGenerator';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeExamBoard = (value?: string | null): 'CESPE' | 'FCC' | 'FGV' | 'VUNESP' | 'outro' => {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('CEBRASPE') || normalized.includes('CESPE')) return 'CESPE';
  if (normalized.includes('FCC')) return 'FCC';
  if (normalized.includes('FGV')) return 'FGV';
  if (normalized.includes('VUNESP')) return 'VUNESP';
  return 'outro';
};

const buildDifficultyList = (nivel: number, count: number) => {
  const base = clamp(Math.round(nivel) || 3, 1, 5);
  const list: number[] = [];

  for (let i = 0; i < count; i += 1) {
    if (i === 1) {
      list.push(clamp(base - 1, 1, 5));
    } else if (i === 2) {
      list.push(clamp(base + 1, 1, 5));
    } else {
      list.push(base);
    }
  }

  return list;
};

const computeTargetCount = (priority: number, nivel: number, maxPerTopic: number) => {
  const safePriority = clamp(priority, 0, 1);
  let target = 1;

  if (safePriority >= 0.75) target += 2;
  else if (safePriority >= 0.45) target += 1;

  if (nivel >= 4) target += 1;

  return clamp(target, 1, maxPerTopic);
};

const toPlanKey = (discipline: string, topic: string) => `${discipline.toLowerCase()}::${topic.toLowerCase()}`;

async function getExistingCount(editalId: string, discipline: string, topic: string) {
  const { rows } = await query<{ count: number }>(
    `
      SELECT COUNT(*)::int AS count
      FROM edital_questoes eq
      JOIN questoes q ON q.id = eq.questao_id
      WHERE eq.edital_id = $1
        AND eq.disciplina = $2
        AND COALESCE(eq.topico, q.topic) = $3
        AND q.status = 'active'
    `,
    [editalId, discipline, topic]
  );

  return Number(rows[0]?.count || 0);
}

export async function generateQuestionsForEdital(params: {
  editalId: string;
  userId: string;
  maxTotalQuestions?: number;
  maxTopics?: number;
  maxPerTopic?: number;
  status?: 'draft' | 'active';
}) {
  const maxTotalQuestions = params.maxTotalQuestions ?? toPositiveInt(process.env.QUESTIONS_MAX_TOTAL, 60);
  const maxTopics = params.maxTopics ?? toPositiveInt(process.env.QUESTIONS_MAX_TOPICS, 25);
  const maxPerTopic = params.maxPerTopic ?? toPositiveInt(process.env.QUESTIONS_MAX_PER_TOPIC, 4);
  const status = params.status ?? 'active';

  const edital = await editalRepository.findById(params.editalId);
  if (!edital) {
    throw new Error('edital_not_found');
  }

  const autoFormacao = await generateAutoFormacao({ editalId: params.editalId, userId: params.userId });
  let payload: any = autoFormacao.payload || {};
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }

  const drops = Array.isArray(payload?.drops) ? payload.drops : [];
  const map = new Map<string, { discipline: string; topic: string; priority: number; nivel: number }>();

  for (const drop of drops) {
    const discipline = String(drop?.disciplina || '').trim();
    const topic = String(drop?.subtopico || '').trim();
    if (!discipline || !topic) continue;

    const priority = Number(drop?.prioridade ?? 0) || 0;
    const nivel = Number(drop?.nivel ?? 3) || 3;
    const key = toPlanKey(discipline, topic);

    const existing = map.get(key);
    if (!existing || priority > existing.priority) {
      map.set(key, { discipline, topic, priority, nivel });
    }
  }

  const ranked = Array.from(map.values()).sort((a, b) => b.priority - a.priority).slice(0, maxTopics);
  const examBoard = normalizeExamBoard(edital.banca);
  const context = `Edital: ${edital.titulo}. Orgao: ${edital.orgao}.`;

  let questionsGenerated = 0;
  let topicsProcessed = 0;
  let topicsSkipped = 0;
  const errors: Array<{ topic: string; message: string }> = [];

  for (const entry of ranked) {
    if (questionsGenerated >= maxTotalQuestions) break;

    const targetCount = computeTargetCount(entry.priority, entry.nivel, maxPerTopic);
    const existingCount = await getExistingCount(params.editalId, entry.discipline, entry.topic);
    const remaining = Math.max(0, targetCount - existingCount);

    if (remaining === 0) {
      topicsSkipped += 1;
      continue;
    }

    const remainingAllowed = Math.max(0, maxTotalQuestions - questionsGenerated);
    const toGenerate = Math.min(remaining, remainingAllowed);
    const difficultyList = buildDifficultyList(entry.nivel, toGenerate);

    const difficultyBuckets = new Map<number, number>();
    difficultyList.forEach((difficulty) => {
      difficultyBuckets.set(difficulty, (difficultyBuckets.get(difficulty) || 0) + 1);
    });

    try {
      for (const [difficulty, count] of difficultyBuckets.entries()) {
        const batch = await generateQuestionBatch(
          {
            topic: entry.topic,
            discipline: entry.discipline,
            examBoard,
            difficulty: clamp(difficulty, 1, 5) as 1 | 2 | 3 | 4 | 5,
            context,
          },
          count
        );

        for (const question of batch) {
          const questionId = await QuestionRepository.saveGeneratedQuestion(
            question,
            entry.discipline,
            entry.topic,
            examBoard,
            status
          );

          await editalRepository.addQuestao(
            params.editalId,
            questionId,
            entry.discipline,
            entry.topic,
            entry.priority
          );

          questionsGenerated += 1;
        }
      }

      topicsProcessed += 1;
    } catch (err: any) {
      errors.push({
        topic: `${entry.discipline} :: ${entry.topic}`,
        message: err?.message || 'unknown_error',
      });
    }
  }

  return {
    edital_id: params.editalId,
    user_id: params.userId,
    exam_board: examBoard,
    max_total: maxTotalQuestions,
    max_topics: maxTopics,
    max_per_topic: maxPerTopic,
    topics_planned: ranked.length,
    topics_processed: topicsProcessed,
    topics_skipped: topicsSkipped,
    questions_generated: questionsGenerated,
    errors,
  };
}

export default {
  generateQuestionsForEdital,
};
