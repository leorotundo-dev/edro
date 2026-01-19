import { query } from '../../db';

export interface DailyPlanItem {
  dropId: number;
  topicCode: string;
  dropType: string | null;
  difficulty: number | null;
  dropText: any;
  isReview: boolean;
}

export interface DailyPlanResult {
  userId: string;
  generatedAt: string;
  items: DailyPlanItem[];
}

interface UserStatRow {
  topic_code: string;
  correct_count: number;
  wrong_count: number;
  streak: number;
  last_seen_at: string | null;
  next_due_at: string | null;
}

interface DropRow {
  id: number;
  topic_code: string;
  drop_type: string | null;
  difficulty: number | null;
  drop_text: any;
}

const DEFAULT_DAILY_LIMIT = 30;

/**
 * Buscar tópicos com revisão pendente (SRS)
 */
async function getDueTopics(userId: string, limit: number): Promise<UserStatRow[]> {
  const { rows } = await query<UserStatRow>(
    `
    SELECT topic_code, correct_count, wrong_count, streak, last_seen_at, next_due_at
    FROM user_stats
    WHERE user_id = $1
      AND next_due_at IS NOT NULL
      AND next_due_at <= NOW()
    ORDER BY next_due_at ASC
    LIMIT $2
    `,
    [userId, limit]
  );
  return rows;
}

/**
 * Buscar um drop aleatório para um tópico
 */
async function getOneDropByTopic(topicCode: string): Promise<DropRow | null> {
  const { rows } = await query<DropRow>(
    `
    SELECT id, topic_code, drop_type, difficulty, drop_text
    FROM drops
    WHERE topic_code = $1
    ORDER BY RANDOM()
    LIMIT 1
    `,
    [topicCode]
  );
  return rows[0] ?? null;
}

/**
 * Buscar drops de tópicos novos (que o usuário nunca viu)
 */
async function getNewTopicDrops(userId: string, limit: number): Promise<DropRow[]> {
  const { rows } = await query<DropRow>(
    `
    SELECT DISTINCT ON (d.topic_code)
           d.id, d.topic_code, d.drop_type, d.difficulty, d.drop_text
    FROM drops d
    WHERE NOT EXISTS (
      SELECT 1 FROM user_stats us
      WHERE us.user_id = $1 AND us.topic_code = d.topic_code
    )
    ORDER BY d.topic_code, d.id ASC
    LIMIT $2
    `,
    [userId, limit]
  );
  return rows;
}

/**
 * Gerar plano diário para um usuário
 * 
 * Algoritmo:
 * 1. Buscar tópicos com revisão pendente (SRS)
 * 2. Para cada tópico, selecionar 1 drop aleatório
 * 3. Se não atingiu limite, buscar tópicos novos
 * 4. Retornar lista de drops para estudar hoje
 */
export async function generateDailyPlanForUser(
  userId: string,
  limit: number = DEFAULT_DAILY_LIMIT
): Promise<DailyPlanResult> {
  const items: DailyPlanItem[] = [];

  console.log(`[daily-plan] Gerando plano para userId=${userId}, limit=${limit}`);

  // Fase 1: Revisões (SRS)
  console.log('[daily-plan] Fase 1: Buscando tópicos com revisão pendente');
  const dueTopics = await getDueTopics(userId, limit);
  console.log(`[daily-plan] Encontrados ${dueTopics.length} tópicos para revisar`);

  for (const stat of dueTopics) {
    const drop = await getOneDropByTopic(stat.topic_code);
    if (!drop) {
      console.warn(`[daily-plan] ⚠️  Nenhum drop encontrado para tópico ${stat.topic_code}`);
      continue;
    }

    items.push({
      dropId: drop.id,
      topicCode: drop.topic_code,
      dropType: drop.drop_type,
      difficulty: drop.difficulty,
      dropText: drop.drop_text,
      isReview: true
    });

    if (items.length >= limit) break;
  }

  // Fase 2: Novos tópicos
  if (items.length < limit) {
    const remaining = limit - items.length;
    console.log(`[daily-plan] Fase 2: Buscando ${remaining} tópicos novos`);
    const newDrops = await getNewTopicDrops(userId, remaining);
    console.log(`[daily-plan] Encontrados ${newDrops.length} tópicos novos`);

    for (const drop of newDrops) {
      items.push({
        dropId: drop.id,
        topicCode: drop.topic_code,
        dropType: drop.drop_type,
        difficulty: drop.difficulty,
        dropText: drop.drop_text,
        isReview: false
      });
    }
  }

  console.log(`[daily-plan] ✅ Plano gerado com ${items.length} drops`);

  return {
    userId,
    generatedAt: new Date().toISOString(),
    items
  };
}
