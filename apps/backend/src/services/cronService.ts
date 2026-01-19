/**
 * Cron Service
 * 
 * Sistema de agendamento de jobs (cron-like)
 */

import { query } from '../db';
import { JobService } from './jobService';

// ============================================
// TIPOS
// ============================================

export interface Schedule {
  id: string;
  name: string;
  type: string;
  schedule: string; // cron expression
  data: any;
  enabled: boolean;
  last_run?: Date;
  next_run?: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// SCHEDULE MANAGEMENT
// ============================================

export async function getSchedules(enabled?: boolean): Promise<Schedule[]> {
  let sql = 'SELECT * FROM job_schedules';
  const params: any[] = [];

  if (enabled !== undefined) {
    sql += ' WHERE enabled = $1';
    params.push(enabled);
  }

  sql += ' ORDER BY next_run ASC NULLS LAST';

  const { rows } = await query<Schedule>(sql, params);
  return rows;
}

export async function getScheduleById(id: string): Promise<Schedule | null> {
  const { rows } = await query<Schedule>(`
    SELECT * FROM job_schedules WHERE id = $1
  `, [id]);

  return rows[0] || null;
}

export async function createSchedule(params: {
  name: string;
  type: string;
  schedule: string;
  data?: any;
  enabled?: boolean;
}): Promise<string> {
  console.log(`[cron] Criando schedule: ${params.name}`);

  const nextRun = calculateNextRun(params.schedule);

  const { rows } = await query<{ id: string }>(`
    INSERT INTO job_schedules (
      name, type, schedule, data, enabled, next_run
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [
    params.name,
    params.type,
    params.schedule,
    JSON.stringify(params.data || {}),
    params.enabled !== undefined ? params.enabled : true,
    nextRun,
  ]);

  return rows[0].id;
}

export async function updateSchedule(id: string, params: Partial<Schedule>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (params.schedule !== undefined) {
    fields.push(`schedule = $${paramCount++}`);
    values.push(params.schedule);

    // Recalcular next_run
    const nextRun = calculateNextRun(params.schedule);
    fields.push(`next_run = $${paramCount++}`);
    values.push(nextRun);
  }

  if (params.data !== undefined) {
    fields.push(`data = $${paramCount++}`);
    values.push(JSON.stringify(params.data));
  }

  if (params.enabled !== undefined) {
    fields.push(`enabled = $${paramCount++}`);
    values.push(params.enabled);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = NOW()');
  values.push(id);

  await query(
    `UPDATE job_schedules SET ${fields.join(', ')} WHERE id = $${paramCount}`,
    values
  );
}

export async function deleteSchedule(id: string): Promise<void> {
  await query('DELETE FROM job_schedules WHERE id = $1', [id]);
}

// ============================================
// CRON RUNNER
// ============================================

let cronRunning = false;

export async function startCron(): Promise<void> {
  if (cronRunning) {
    console.log('[cron] Cron já está rodando');
    return;
  }

  cronRunning = true;
  console.log('[cron] 🕐 Cron iniciado');

  while (cronRunning) {
    try {
      await checkSchedules();
      
      // Verificar a cada 1 minuto
      await new Promise(resolve => setTimeout(resolve, 60000));
    } catch (err) {
      console.error('[cron] Erro no cron:', err);
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  console.log('[cron] Cron parado');
}

export function stopCron(): void {
  cronRunning = false;
}

async function checkSchedules(): Promise<void> {
  const now = new Date();

  // Buscar schedules que devem rodar
  const { rows } = await query<Schedule>(`
    SELECT * FROM job_schedules
    WHERE enabled = true
      AND (next_run IS NULL OR next_run <= $1)
    ORDER BY next_run ASC
  `, [now]);

  for (const schedule of rows) {
    try {
      console.log(`[cron] Executando schedule: ${schedule.name}`);

      // Criar job
      await JobService.createJob({
        name: `[Scheduled] ${schedule.name}`,
        type: schedule.type,
        data: schedule.data,
        priority: 7, // Alta prioridade para jobs agendados
      });

      // Atualizar last_run e next_run
      const nextRun = calculateNextRun(schedule.schedule, now);
      await query(`
        UPDATE job_schedules
        SET last_run = $2, next_run = $3, updated_at = NOW()
        WHERE id = $1
      `, [schedule.id, now, nextRun]);

      console.log(`[cron] ✅ Schedule ${schedule.name} agendado para ${nextRun}`);
    } catch (err) {
      console.error(`[cron] Erro ao executar schedule ${schedule.id}:`, err);
    }
  }
}

// ============================================
// CRON PARSER (simplificado)
// ============================================

function calculateNextRun(cronExpression: string, from: Date = new Date()): Date {
  // Parser simplificado de cron
  // Formato: minuto hora dia mês dia-da-semana
  // Exemplo: "0 3 * * *" = todo dia às 03:00

  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Expressão cron inválida: ${cronExpression}`);
  }

  const [minute, hour, day, month, dayOfWeek] = parts;

  const next = new Date(from);
  next.setSeconds(0);
  next.setMilliseconds(0);

  // Parse minuto
  if (minute !== '*') {
    next.setMinutes(parseInt(minute));
  }

  // Parse hora
  if (hour !== '*') {
    next.setHours(parseInt(hour));
  }

  // Se a hora já passou hoje, ir para amanhã
  if (next <= from) {
    next.setDate(next.getDate() + 1);
  }

  // Parse dia da semana (0-6, domingo = 0)
  if (dayOfWeek !== '*') {
    const targetDay = parseInt(dayOfWeek);
    const currentDay = next.getDay();
    let daysToAdd = targetDay - currentDay;
    
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    
    next.setDate(next.getDate() + daysToAdd);
  }

  // Parse dia do mês
  if (day !== '*') {
    next.setDate(parseInt(day));
  }

  // Parse mês (1-12)
  if (month !== '*') {
    next.setMonth(parseInt(month) - 1);
  }

  return next;
}

// ============================================
// HELPERS
// ============================================

export function parseCronExpression(cronExpression: string): {
  minute: string;
  hour: string;
  day: string;
  month: string;
  dayOfWeek: string;
} {
  const parts = cronExpression.trim().split(/\s+/);
  
  if (parts.length !== 5) {
    throw new Error(`Expressão cron inválida: ${cronExpression}`);
  }

  return {
    minute: parts[0],
    hour: parts[1],
    day: parts[2],
    month: parts[3],
    dayOfWeek: parts[4],
  };
}

export function describeCronExpression(cronExpression: string): string {
  try {
    const parts = parseCronExpression(cronExpression);
    const descriptions: string[] = [];

    // Minuto
    if (parts.minute === '*') {
      descriptions.push('todo minuto');
    } else {
      descriptions.push(`no minuto ${parts.minute}`);
    }

    // Hora
    if (parts.hour === '*') {
      descriptions.push('toda hora');
    } else {
      descriptions.push(`às ${parts.hour}:00`);
    }

    // Dia
    if (parts.day !== '*') {
      descriptions.push(`no dia ${parts.day}`);
    }

    // Dia da semana
    if (parts.dayOfWeek !== '*') {
      const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      descriptions.push(`nas ${days[parseInt(parts.dayOfWeek)]}-feiras`);
    }

    // Mês
    if (parts.month !== '*') {
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      descriptions.push(`em ${months[parseInt(parts.month) - 1]}`);
    }

    return descriptions.join(', ');
  } catch (err) {
    return cronExpression;
  }
}

// ============================================
// STATISTICS
// ============================================

export async function getCronStats(): Promise<{
  total_schedules: number;
  enabled_schedules: number;
  next_runs: Array<{ name: string; next_run: Date }>;
}> {
  const { rows: total } = await query(`
    SELECT COUNT(*) as count FROM job_schedules
  `);

  const { rows: enabled } = await query(`
    SELECT COUNT(*) as count FROM job_schedules WHERE enabled = true
  `);

  const { rows: nextRuns } = await query(`
    SELECT name, next_run
    FROM job_schedules
    WHERE enabled = true AND next_run IS NOT NULL
    ORDER BY next_run ASC
    LIMIT 5
  `);

  return {
    total_schedules: parseInt(total[0].count),
    enabled_schedules: parseInt(enabled[0].count),
    next_runs: nextRuns.map((r: any) => ({
      name: r.name,
      next_run: r.next_run,
    })),
  };
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const CronService = {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  startCron,
  stopCron,
  parseCronExpression,
  describeCronExpression,
  getCronStats,
};

export default CronService;
