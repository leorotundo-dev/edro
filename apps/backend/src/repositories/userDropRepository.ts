import { query } from '../db';

export type UserDropStatus = 'pending' | 'in_progress' | 'done';

export interface UserDrop {
  id: string;
  user_id: string;
  drop_id: string;
  status: UserDropStatus;
  last_opened_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Marca um Drop como "em progresso" (o aluno abriu o Drop).
 * Não vamos usar imediatamente em todos os fluxos,
 * mas já deixamos pronto para o futuro.
 */
export async function markDropOpened(
  userId: string,
  dropId: string | number
): Promise<UserDrop> {
  const { rows } = await query<UserDrop>(
    `
      INSERT INTO user_drops (user_id, drop_id, status, last_opened_at)
      VALUES ($1, $2, 'in_progress', NOW())
      ON CONFLICT (user_id, drop_id)
      DO UPDATE SET
        status = 'in_progress',
        last_opened_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `,
    [userId, dropId]
  );

  return rows[0];
}

/**
 * Marca um Drop como concluído para o usuário.
 * Se já existir um registro para (user_id, drop_id), atualiza.
 * Se não existir, cria.
 */
export async function markDropCompleted(
  userId: string,
  dropId: string | number
): Promise<UserDrop> {
  const { rows } = await query<UserDrop>(
    `
      INSERT INTO user_drops (user_id, drop_id, status, completed_at)
      VALUES ($1, $2, 'done', NOW())
      ON CONFLICT (user_id, drop_id)
      DO UPDATE SET
        status = 'done',
        completed_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `,
    [userId, dropId]
  );

  return rows[0];
}
