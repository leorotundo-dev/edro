import { query } from '../db';

export interface ExamLog {
  id: number;
  user_id: string;
  drop_id: number | null;
  was_correct: boolean | null;
  answered_at: Date;
}

/**
 * Registra uma tentativa de resposta do usuário em exam_logs.
 *
 * Cada vez que o aluno responde um Drop, gravamos:
 * - user_id
 * - drop_id
 * - se foi correta ou não (was_correct)
 * - answered_at (automaticamente pelo banco)
 */
export async function createExamLog(
  userId: string,
  dropId: number,
  wasCorrect: boolean
): Promise<ExamLog> {
  const { rows } = await query<ExamLog>(
    `
      INSERT INTO exam_logs (user_id, drop_id, was_correct)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [userId, dropId, wasCorrect]
  );

  return rows[0];
}
