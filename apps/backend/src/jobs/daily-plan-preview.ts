import 'dotenv/config';
import { pool } from '../db';
import { generateDailyPlanForUser } from '../services/plan/dailyPlan';

async function main() {
  const userId = process.env.DAILY_PLAN_USER_ID || 'test-user-001';
  console.log('[daily-plan-preview] Gerando plano para user=', userId);
  
  try {
    const plan = await generateDailyPlanForUser(userId);
    console.log('[daily-plan-preview] ✅ Plano gerado com sucesso');
    console.dir(plan, { depth: null });
  } catch (err) {
    console.error('[daily-plan-preview] ❌ Erro ao gerar plano:', err);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('[daily-plan-preview] ❌ Erro fatal:', err);
  process.exit(1);
});
