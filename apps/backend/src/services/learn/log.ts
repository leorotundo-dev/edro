import { query } from '../../db';
import { markDropCompleted } from '../../repositories/userDropRepository';
import { createExamLog } from '../../repositories/examLogRepository';
import { upsertUserStatsForTopic } from './userStats';

export interface LogInput {
  userId: string;
  dropId: number;
  wasCorrect: boolean;
}

interface DropRow {
  id: number;
  topic_code: string;
}

/**
 * Registrar resposta do usuario e atualizar SRS + logs.
 *
 * Fluxo:
 * 1. Buscar drop para obter topic_code
 * 2. Atualizar user_stats
 * 3. Registrar exam_log
 * 4. Marcar user_drops como concluido
 */
export async function learnLog({ userId, dropId, wasCorrect }: LogInput) {
  console.log(
    `[learn-log] Registrando resposta: userId=${userId}, dropId=${dropId}, wasCorrect=${wasCorrect}`
  );

  // 1) Buscar drop para obter topic_code
  const { rows: dropRows } = await query<DropRow>(
    `SELECT id, topic_code FROM drops WHERE id=$1 LIMIT 1`,
    [dropId]
  );

  if (dropRows.length === 0) {
    throw new Error(`Drop ${dropId} nao encontrado`);
  }

  const topicCode = dropRows[0].topic_code;
  const now = new Date();

  const result = await upsertUserStatsForTopic({
    userId,
    topicCode,
    wasCorrect,
    now,
  });

  console.log(
    `[learn-log] Registro ${result.status}: streak=${result.streak}, nextDue=${result.nextDue.toISOString()}`
  );

  // 3) exam_logs (best-effort, nao quebra fluxo se falhar)
  try {
    await createExamLog(userId, dropId, wasCorrect);
  } catch (err) {
    console.error('[learn-log] Falha ao registrar exam_log', err);
  }

  // 4) user_drops (best-effort, nao quebra fluxo se falhar)
  try {
    await markDropCompleted(userId, dropId);
  } catch (err) {
    console.error('[learn-log] Falha ao marcar user_drops como concluido', err);
  }

  return result;
}
