/**
 * Daily Plan Service
 * 
 * Gera e gerencia plano diário de estudos integrado com ReccoEngine
 */

import { query } from '../../db';
import { ReccoEngine } from '../reccoEngine';
import { ReccoRepository } from '../../repositories/reccoRepository';
import { cacheDelPattern, cacheGet, cacheSet } from '../redisCache';
import type { TrailOfDay } from '../../types/reccoEngine';
import { ProgressService } from '../progressService';
import { upsertUserStatsForTopic } from '../learn/userStats';

// ============================================
// TIPOS
// ============================================

export interface DailyPlanItem {
  id: string;
  type: 'drop' | 'srs_review' | 'revisao_srs' | 'question' | 'questao' | 'simulado' | 'bloco' | 'rest';
  content_id?: string;
  title: string;
  description?: string;
  duration_minutes: number;
  difficulty?: number;
  order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  started_at?: Date;
  completed_at?: Date;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  date: string;
  items: DailyPlanItem[];
  total_duration_minutes: number;
  completed_items: number;
  total_items: number;
  progress_percentage: number;
  generated_at: Date;
  trail_data?: TrailOfDay;
}

export interface GeneratePlanParams {
  userId: string;
  date?: Date;
  tempoDisponivel?: number;
  blueprintId?: number;
  diasAteProva?: number;
  bancaPreferencial?: string;
  forceTopics?: string[];
}

const DEFAULT_PLAN_CACHE_TTL = toPositiveInt(process.env.DAILY_PLAN_CACHE_TTL, 300);

function buildPlanCacheKey(userId: string, dateStr: string) {
  return `daily_plan:${userId}:${dateStr}`;
}

async function getCachedPlan(userId: string, dateStr: string): Promise<DailyPlan | null> {
  const key = buildPlanCacheKey(userId, dateStr);
  return cacheGet<DailyPlan>(key);
}

async function setCachedPlan(plan: DailyPlan): Promise<void> {
  if (!plan?.user_id || !plan?.date) return;
  const key = buildPlanCacheKey(plan.user_id, plan.date);
  await cacheSet(key, plan, DEFAULT_PLAN_CACHE_TTL);
}

async function invalidatePlanCache(userId: string): Promise<void> {
  await cacheDelPattern(`daily_plan:${userId}:*`);
}

// ============================================
// GERAÇÃO DE PLANO
// ============================================

/**
 * Gera plano diário usando ReccoEngine
 */
export async function generateDailyPlan(params: GeneratePlanParams): Promise<DailyPlan> {
  const planDate = params.date || new Date();
  const dateStr = planDate.toISOString().split('T')[0];

  console.log(`[daily-plan] Gerando plano para ${params.userId} em ${dateStr}`);

  const cachedPlan = await getCachedPlan(params.userId, dateStr);
  if (cachedPlan) {
    console.log(`[daily-plan] Cache hit para ${params.userId} em ${dateStr}`);
    return cachedPlan;
  }

  // Verificar se já existe plano para hoje
  const existingPlan = await getPlanForDate(params.userId, planDate);
  if (existingPlan && existingPlan.completed_items === 0) {
    console.log(`[daily-plan] Plano já existe para hoje, retornando...`);
    await setCachedPlan(existingPlan);
    return existingPlan;
  }

  // Usar ReccoEngine para gerar trilha
  const reccoResult = await ReccoEngine.run({
    userId: params.userId,
    blueprintId: params.blueprintId,
    diasAteProva: params.diasAteProva,
    bancaPreferencial: params.bancaPreferencial,
    tempoDisponivel: params.tempoDisponivel || 60,
    forceTopics: params.forceTopics,
  });

  // Converter trilha em items do plano
  const items: DailyPlanItem[] = reccoResult.trail.items.map((item, index) => ({
    id: `item-${Date.now()}-${index}`,
    type: item.type as any,
    content_id: item.content_id,
    title: getTitleForItem(item.type, item.content_id),
    description: item.reason,
    duration_minutes: item.duration_minutes,
    difficulty: item.difficulty,
    order: item.order,
    status: 'pending' as const,
  }));

  // Adicionar intervalo de descanso a cada 50 minutos
  const itemsWithRest = addRestBreaks(items);

  // Salvar no banco
  const planId = await savePlan({
    userId: params.userId,
    date: dateStr,
    items: itemsWithRest,
    totalDuration: reccoResult.trail.total_duration_minutes,
    trailData: reccoResult.trail,
  });

  const plan: DailyPlan = {
    id: planId,
    user_id: params.userId,
    date: dateStr,
    items: itemsWithRest,
    total_duration_minutes: reccoResult.trail.total_duration_minutes,
    completed_items: 0,
    total_items: itemsWithRest.length,
    progress_percentage: 0,
    generated_at: new Date(),
    trail_data: reccoResult.trail,
  };

  console.log(`[daily-plan] ✅ Plano gerado: ${itemsWithRest.length} itens, ${plan.total_duration_minutes} min`);

  await setCachedPlan(plan);
  return plan;
}

/**
 * Adiciona intervalos de descanso
 */
function addRestBreaks(items: DailyPlanItem[]): DailyPlanItem[] {
  const result: DailyPlanItem[] = [];
  let cumulativeTime = 0;
  let restCount = 0;

  items.forEach((item, index) => {
    result.push(item);
    cumulativeTime += item.duration_minutes;

    // Adicionar descanso a cada 50 minutos
    if (cumulativeTime >= 50 && index < items.length - 1) {
      result.push({
        id: `rest-${restCount++}`,
        type: 'rest',
        title: '☕ Intervalo',
        description: 'Faça uma pausa de 5-10 minutos',
        duration_minutes: 5,
        order: item.order + 0.5,
        status: 'pending',
      });
      cumulativeTime = 0;
    }
  });

  return result;
}

/**
 * Gera título para item
 */
function getTitleForItem(type: string, contentId?: string): string {
  switch (type) {
    case 'drop':
      return `📖 Estudar Drop`;
    case 'srs_review':
    case 'revisao_srs':
      return `🔄 Revisar Card SRS`;
    case 'question':
    case 'questao':
      return `❓ Resolver Questão`;
    case 'simulado':
      return `🎯 Fazer Simulado`;
    case 'bloco':
      return `📚 Estudar Bloco`;
    default:
      return `📝 Atividade`;
  }
}

// ============================================
// PERSISTÊNCIA
// ============================================

/**
 * Salva plano no banco
 */
async function savePlan(params: {
  userId: string;
  date: string;
  items: DailyPlanItem[];
  totalDuration: number;
  trailData: TrailOfDay;
}): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO daily_plans (
      user_id, plan_date, items, total_duration_minutes,
      completed_items, total_items, trail_data
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id, plan_date) 
    DO UPDATE SET 
      items = $3,
      total_duration_minutes = $4,
      total_items = $6,
      trail_data = $7,
      updated_at = NOW()
    RETURNING id
  `, [
    params.userId,
    params.date,
    JSON.stringify(params.items),
    params.totalDuration,
    0,
    params.items.length,
    JSON.stringify(params.trailData),
  ]);

  return rows[0].id;
}

/**
 * Busca plano para uma data
 */
export async function getPlanForDate(userId: string, date: Date): Promise<DailyPlan | null> {
  const dateStr = date.toISOString().split('T')[0];

  const cachedPlan = await getCachedPlan(userId, dateStr);
  if (cachedPlan) return cachedPlan;

  const { rows } = await query<any>(`
    SELECT * FROM daily_plans
    WHERE user_id = $1 AND plan_date = $2
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId, dateStr]);

  if (rows.length === 0) return null;

  const row = rows[0];
  const items = row.items || [];
  const completedCount = items.filter((i: any) => i.status === 'completed').length;

  const plan: DailyPlan = {
    id: row.id,
    user_id: row.user_id,
    date: row.plan_date,
    items,
    total_duration_minutes: row.total_duration_minutes,
    completed_items: completedCount,
    total_items: row.total_items,
    progress_percentage: Math.round((completedCount / row.total_items) * 100),
    generated_at: row.created_at,
    trail_data: row.trail_data,
  };

  await setCachedPlan(plan);
  return plan;
}

/**
 * Busca plano de hoje
 */
export async function getTodayPlan(userId: string): Promise<DailyPlan | null> {
  return getPlanForDate(userId, new Date());
}

// ============================================
// ATUALIZAÇÃO DE STATUS
// ============================================

/**
 * Inicia um item do plano
 */
export async function startPlanItem(
  planId: string,
  itemId: string
): Promise<void> {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error('Plano não encontrado');

  const items = plan.items.map((item: DailyPlanItem) => {
    if (item.id === itemId) {
      return {
        ...item,
        status: 'in_progress',
        started_at: new Date(),
      };
    }
    return item;
  });

  await updatePlanItems(planId, items);
  await invalidatePlanCache(plan.user_id);
  console.log(`[daily-plan] Item ${itemId} iniciado`);
}

/**
 * Completa um item do plano
 */
export async function completePlanItem(
  planId: string,
  itemId: string,
  timeSpent?: number,
  wasCorrect?: boolean
): Promise<DailyPlanItem | null> {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error('Plano nÆo encontrado');

  let completedItem: DailyPlanItem | null = null;
  const items = plan.items.map((item: DailyPlanItem) => {
    if (item.id === itemId) {
      const nextItem = {
        ...item,
        status: 'completed',
        completed_at: new Date(),
      };
      completedItem = nextItem;
      return nextItem;
    }
    return item;
  });

  const completedCount = items.filter((i: DailyPlanItem) => i.status === 'completed').length;

  await query(`
    UPDATE daily_plans
    SET items = $2,
        completed_items = $3,
        updated_at = NOW()
    WHERE id = $1
  `, [planId, JSON.stringify(items), completedCount]);

  await invalidatePlanCache(plan.user_id);
  console.log(`[daily-plan] Item ${itemId} completado (${completedCount}/${items.length})`);

  if (completedItem) {
    try {
      await handlePlanItemCompletion({
        userId: plan.user_id,
        item: completedItem,
        timeSpent,
        wasCorrect,
      });
    } catch (err) {
      console.warn('[daily-plan] Falha ao registrar feedback do item:', (err as any)?.message);
    }
  }

  return completedItem;
}

/**
 * Pula um item do plano
 */
export async function skipPlanItem(
  planId: string,
  itemId: string,
  reason?: string
): Promise<void> {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error('Plano não encontrado');

  const items = plan.items.map((item: DailyPlanItem) => {
    if (item.id === itemId) {
      return {
        ...item,
        status: 'skipped',
      };
    }
    return item;
  });

  await updatePlanItems(planId, items);
  await invalidatePlanCache(plan.user_id);
  console.log(`[daily-plan] Item ${itemId} pulado (razão: ${reason})`);
}

/**
 * Ajusta o plano em tempo real
 */
export async function adjustPlan(
  planId: string,
  adjustments: {
    removeItemId?: string;
    addItem?: Partial<DailyPlanItem>;
    reorderItems?: Array<{ itemId: string; newOrder: number }>;
  }
): Promise<DailyPlan> {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error('Plano não encontrado');

  let items = [...plan.items];

  // Remover item
  if (adjustments.removeItemId) {
    items = items.filter(i => i.id !== adjustments.removeItemId);
  }

  // Adicionar item
  if (adjustments.addItem) {
    const newItem: DailyPlanItem = {
      id: `item-${Date.now()}`,
      type: adjustments.addItem.type || 'drop',
      content_id: adjustments.addItem.content_id,
      title: adjustments.addItem.title || 'Nova atividade',
      description: adjustments.addItem.description,
      duration_minutes: adjustments.addItem.duration_minutes || 5,
      difficulty: adjustments.addItem.difficulty,
      order: adjustments.addItem.order || items.length + 1,
      status: 'pending',
    };
    items.push(newItem);
  }

  // Reordenar
  if (adjustments.reorderItems) {
    adjustments.reorderItems.forEach(reorder => {
      const item = items.find(i => i.id === reorder.itemId);
      if (item) {
        item.order = reorder.newOrder;
      }
    });
    items.sort((a, b) => a.order - b.order);
  }

  await updatePlanItems(planId, items);
  await invalidatePlanCache(plan.user_id);

  return getPlanById(planId) as Promise<DailyPlan>;
}

// ============================================
// HELPERS
// ============================================

async function getPlanById(planId: string): Promise<any> {
  const { rows } = await query(`
    SELECT * FROM daily_plans WHERE id = $1
  `, [planId]);

  return rows[0] || null;
}

async function updatePlanItems(planId: string, items: DailyPlanItem[]): Promise<void> {
  await query(`
    UPDATE daily_plans
    SET items = $2, updated_at = NOW()
    WHERE id = $1
  `, [planId, JSON.stringify(items)]);
}

function toPositiveInt(value: any, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function normalizePlanItemType(type: string): 'drop' | 'question' | 'srs_review' | 'simulado' | 'rest' {
  if (type === 'revisao_srs') return 'srs_review';
  if (type === 'questao') return 'question';
  if (type === 'srs_review') return 'srs_review';
  if (type === 'question') return 'question';
  if (type === 'bloco') return 'drop';
  if (type === 'simulado') return 'simulado';
  if (type === 'rest') return 'rest';
  return 'drop';
}

async function resolveTopicForPlanItem(item: DailyPlanItem): Promise<string | null> {
  if (!item.content_id) return null;
  const normalized = normalizePlanItemType(item.type);

  if (normalized === 'drop' || normalized === 'srs_review') {
    const { rows } = await query<{ topic_code: string | null }>(
      'SELECT topic_code FROM drops WHERE id = $1 LIMIT 1',
      [item.content_id]
    );
    return rows[0]?.topic_code ?? null;
  }

  if (normalized === 'question') {
    const { rows } = await query<{ topic: string | null; subtopico: string | null }>(
      'SELECT topic, subtopico FROM questoes WHERE id = $1 LIMIT 1',
      [item.content_id]
    );
    return rows[0]?.topic || rows[0]?.subtopico || null;
  }

  return null;
}

async function handlePlanItemCompletion(params: {
  userId: string;
  item: DailyPlanItem;
  timeSpent?: number;
  wasCorrect?: boolean;
}): Promise<void> {
  const normalized = normalizePlanItemType(params.item.type);
  const topicCode = await resolveTopicForPlanItem(params.item);

  if (topicCode && typeof params.wasCorrect === 'boolean' && (normalized === 'drop' || normalized === 'question')) {
    await upsertUserStatsForTopic({
      userId: params.userId,
      topicCode,
      wasCorrect: params.wasCorrect,
    });
  }

  if (normalized === 'drop') {
    await ProgressService.updateProgressRealtime({
      userId: params.userId,
      type: 'drop',
      correct: params.wasCorrect,
      timeSpent: params.timeSpent,
      subtopico: topicCode || undefined,
    });
  } else if (normalized === 'question') {
    await ProgressService.updateProgressRealtime({
      userId: params.userId,
      type: 'question',
      correct: params.wasCorrect,
      timeSpent: params.timeSpent,
      subtopico: topicCode || undefined,
    });
  } else if (normalized === 'srs_review') {
    await ProgressService.updateProgressRealtime({
      userId: params.userId,
      type: 'srs_review',
      timeSpent: params.timeSpent,
    });
  }

  if (normalized !== 'rest') {
    await ReccoRepository.saveReccoFeedback({
      user_id: params.userId,
      aluno_completou: true,
      aluno_acertou: typeof params.wasCorrect === 'boolean' ? params.wasCorrect : undefined,
      tempo_real: params.timeSpent ?? undefined,
      tempo_previsto: params.item.duration_minutes,
    });
  }
}

/**
 * Estatísticas do plano
 */
export async function getPlanStats(userId: string): Promise<{
  total_plans: number;
  completed_plans: number;
  avg_completion_rate: number;
  total_study_time: number;
}> {
  const { rows } = await query(`
    SELECT 
      COUNT(*) as total_plans,
      SUM(CASE WHEN completed_items = total_items THEN 1 ELSE 0 END) as completed_plans,
      AVG(completed_items::float / NULLIF(total_items, 0)) as avg_completion_rate,
      SUM(total_duration_minutes) as total_study_time
    FROM daily_plans
    WHERE user_id = $1
  `, [userId]);

  return {
    total_plans: parseInt(rows[0].total_plans || '0'),
    completed_plans: parseInt(rows[0].completed_plans || '0'),
    avg_completion_rate: parseFloat(rows[0].avg_completion_rate || '0'),
    total_study_time: parseInt(rows[0].total_study_time || '0'),
  };
}

/**
 * Histórico de planos
 */
export async function getPlanHistory(
  userId: string,
  limit: number = 30
): Promise<DailyPlan[]> {
  const { rows } = await query(`
    SELECT * FROM daily_plans
    WHERE user_id = $1
    ORDER BY plan_date DESC
    LIMIT $2
  `, [userId, limit]);

  return rows.map(row => {
    const items = row.items || [];
    const completedCount = items.filter((i: any) => i.status === 'completed').length;

    return {
      id: row.id,
      user_id: row.user_id,
      date: row.plan_date,
      items,
      total_duration_minutes: row.total_duration_minutes,
      completed_items: completedCount,
      total_items: row.total_items,
      progress_percentage: Math.round((completedCount / row.total_items) * 100),
      generated_at: row.created_at,
    };
  });
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const DailyPlanService = {
  generateDailyPlan,
  getTodayPlan,
  getPlanForDate,
  startPlanItem,
  completePlanItem,
  skipPlanItem,
  adjustPlan,
  getPlanStats,
  getPlanHistory,
};

export default DailyPlanService;
