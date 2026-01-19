import { query } from '../../db';
import { createDrop, findDropByOriginQuestion, findDropForTopic } from '../../repositories/dropRepository';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface QuestionLike {
  id: string;
  disciplina_id?: string | null;
  discipline?: string | null;
  topic?: string | null;
  subtopico?: string | null;
  exam_board?: string | null;
  question_text?: string | null;
  enunciado?: string | null;
  explanation?: string | null;
  explicacao_longa?: string | null;
  explicacao_curta?: string | null;
  difficulty?: number | null;
}

async function resolveDisciplineId(input?: string | null): Promise<string | null> {
  if (!input) return null;
  if (UUID_REGEX.test(input)) return input;

  const { rows } = await query<{ id: string }>(
    'SELECT id FROM disciplines WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [input]
  );

  return rows[0]?.id ?? null;
}

export async function ensureDropForQuestion(question: QuestionLike): Promise<string | null> {
  if (!question?.id) return null;

  const existing = await findDropByOriginQuestion(question.id);
  if (existing?.id) return existing.id;

  const disciplineId = question.disciplina_id ?? (await resolveDisciplineId(question.discipline ?? null));
  const topicCode = question.topic || question.subtopico || null;

  if (topicCode) {
    const topicDrop = await findDropForTopic({ topicCode, disciplineId: disciplineId ?? undefined });
    if (topicDrop?.id) return topicDrop.id;
  }

  if (!disciplineId) return null;

  const dropTitle = question.question_text || question.enunciado || topicCode || 'Questao';
  const dropText =
    question.explanation ||
    question.explicacao_longa ||
    question.explicacao_curta ||
    question.question_text ||
    question.enunciado ||
    topicCode ||
    'Questao';

  const drop = await createDrop({
    discipline_id: disciplineId,
    title: dropTitle,
    content: JSON.stringify({
      questionId: question.id,
      text: question.question_text || question.enunciado || null,
      topic: topicCode,
      examBoard: question.exam_board || null,
    }),
    difficulty: question.difficulty ?? 1,
    status: 'draft',
    origin: 'question',
    origin_meta: {
      question_id: question.id,
      exam_board: question.exam_board ?? null,
      topic: topicCode,
    },
    topic_code: topicCode,
    drop_type: 'revisao',
    drop_text: dropText,
  });

  return drop.id;
}
