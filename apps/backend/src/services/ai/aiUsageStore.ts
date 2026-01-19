import { query } from '../../db';

type UsageEvent = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  calls: number;
  occurredAt?: Date;
};

type UsageAggregate = {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  calls: number;
};

type UsageTotals = {
  totals: UsageAggregate;
  byModel: Record<string, UsageAggregate>;
};

const pending: UsageEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function normalizeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPending();
  }, 2000);
}

export function enqueueAiUsage(event: UsageEvent) {
  pending.push({
    model: event.model || 'unknown',
    promptTokens: event.promptTokens || 0,
    completionTokens: event.completionTokens || 0,
    totalTokens: event.totalTokens || 0,
    calls: event.calls || 0,
    occurredAt: event.occurredAt || new Date(),
  });
  scheduleFlush();
}

async function flushPending() {
  if (pending.length === 0) return;

  const batch = pending.splice(0, pending.length);
  const aggregates = new Map<string, UsageAggregate & { usage_date: string }>();

  for (const item of batch) {
    const usage_date = normalizeDate(item.occurredAt || new Date());
    const model = item.model || 'unknown';
    const key = `${usage_date}:${model}`;
    const current = aggregates.get(key) || {
      usage_date,
      model,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      calls: 0,
    };
    current.prompt_tokens += item.promptTokens || 0;
    current.completion_tokens += item.completionTokens || 0;
    current.total_tokens += item.totalTokens || 0;
    current.calls += item.calls || 0;
    aggregates.set(key, current);
  }

  try {
    for (const entry of aggregates.values()) {
      await query(
        `INSERT INTO ai_usage_daily
          (usage_date, model, prompt_tokens, completion_tokens, total_tokens, calls, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (usage_date, model)
         DO UPDATE SET
           prompt_tokens = ai_usage_daily.prompt_tokens + EXCLUDED.prompt_tokens,
           completion_tokens = ai_usage_daily.completion_tokens + EXCLUDED.completion_tokens,
           total_tokens = ai_usage_daily.total_tokens + EXCLUDED.total_tokens,
           calls = ai_usage_daily.calls + EXCLUDED.calls,
           updated_at = NOW()`,
        [
          entry.usage_date,
          entry.model,
          entry.prompt_tokens,
          entry.completion_tokens,
          entry.total_tokens,
          entry.calls,
        ]
      );
    }
  } catch (error) {
    console.warn('[ai-usage] Failed to persist usage, keeping in-memory only.', error);
  }
}

export async function getAiUsageForPeriod(startDate: string, endDate: string): Promise<UsageTotals | null> {
  try {
    const { rows } = await query<UsageAggregate>(
      `SELECT
         model,
         SUM(prompt_tokens)::bigint AS prompt_tokens,
         SUM(completion_tokens)::bigint AS completion_tokens,
         SUM(total_tokens)::bigint AS total_tokens,
         SUM(calls)::bigint AS calls
       FROM ai_usage_daily
       WHERE usage_date >= $1 AND usage_date <= $2
       GROUP BY model`,
      [startDate, endDate]
    );

    if (rows.length === 0) return null;

    const totals: UsageAggregate = {
      model: 'total',
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      calls: 0,
    };

    const byModel: Record<string, UsageAggregate> = {};
    rows.forEach(row => {
      const prompt = Number(row.prompt_tokens || 0);
      const completion = Number(row.completion_tokens || 0);
      const total = Number(row.total_tokens || 0);
      const calls = Number(row.calls || 0);

      totals.prompt_tokens += prompt;
      totals.completion_tokens += completion;
      totals.total_tokens += total;
      totals.calls += calls;

      byModel[row.model] = {
        model: row.model,
        prompt_tokens: prompt,
        completion_tokens: completion,
        total_tokens: total,
        calls,
      };
    });

    return { totals, byModel };
  } catch (error) {
    console.warn('[ai-usage] Failed to read usage from DB.', error);
    return null;
  }
}

