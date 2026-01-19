import { query } from '../db';
import { editalRepository } from '../repositories/editalRepository';
import { buildTopicCodeKey } from '../utils/topicCode';
import { addDaysUtc, diffDaysUtc, resolveDateKey } from '../utils/dateUtils';
import { generateAutoFormacao } from './autoFormacaoService';

type ScheduleItemType = 'new' | 'review' | 'practice';

export type MacroScheduleItem = {
  disciplina: string;
  assunto: string;
  subassunto: string;
  nivel: number;
  prioridade: number;
  type: ScheduleItemType;
  minutes: number;
};

export type MacroScheduleDay = {
  date: string;
  phase: 'coverage' | 'consolidation' | 'final';
  items: MacroScheduleItem[];
  total_minutes: number;
  new_count: number;
  review_count: number;
  practice_minutes: number;
};

export type MacroScheduleSummary = {
  edital_id: string;
  user_id: string;
  banca?: string | null;
  exam_date?: string | null;
  days_available: number;
  total_topics: number;
  remaining_topics?: number;
  completed_topics?: number;
  total_minutes: number;
  min_minutes_per_day: number;
  coverage_days: number;
  consolidation_days: number;
  final_days: number;
  review_intervals: number[];
};

export type MacroScheduleResult = {
  summary: MacroScheduleSummary;
  days: MacroScheduleDay[];
};

type TopicInput = {
  disciplina: string;
  assunto: string;
  subassunto: string;
  nivel: number;
  prioridade: number;
  weight: number;
};

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

function clampRatio(value: string | undefined, fallback: number) {
  const parsed = Number.parseFloat(String(value ?? ''));
  if (Number.isFinite(parsed) && parsed > 0 && parsed < 1) return parsed;
  return fallback;
}

const DEFAULT_CALENDAR_DAYS = 63;
const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
const FINAL_REVIEW_WINDOW_DAYS = 7;
const COVERAGE_RATIO = clampRatio(process.env.SCHEDULE_COVERAGE_RATIO, 0.6);
const CONSOLIDATION_RATIO = clampRatio(process.env.SCHEDULE_CONSOLIDATION_RATIO, 0.25);
const NEW_MINUTES_BASE = toPositiveInt(process.env.SCHEDULE_NEW_MINUTES_BASE, 8);
const REVIEW_MINUTES_BASE = toPositiveInt(process.env.SCHEDULE_REVIEW_MINUTES_BASE, 4);
const PRACTICE_MINUTES_BASE = toPositiveInt(process.env.SCHEDULE_PRACTICE_MINUTES_BASE, 10);

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toIsoDate = (value: Date) => value.toISOString().split('T')[0];

const parseJson = (value: any) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

const computeDisciplineWeight = (disciplina: any): number => {
  if (typeof disciplina?.peso === 'number' && disciplina.peso > 0) return disciplina.peso;
  if (typeof disciplina?.numero_questoes === 'number' && disciplina.numero_questoes > 0) {
    return Math.min(10, Math.max(1, Math.round(disciplina.numero_questoes / 4)));
  }
  return 5;
};

const estimateNewMinutes = (nivel: number) => NEW_MINUTES_BASE + Math.max(0, nivel - 1) * 2;
const estimateReviewMinutes = (nivel: number) => REVIEW_MINUTES_BASE + Math.max(0, Math.round((nivel - 1) / 2));

const interleaveTopics = (topics: TopicInput[]): TopicInput[] => {
  if (topics.length <= 1) return topics;
  const byDisc = new Map<string, TopicInput[]>();
  const weights = new Map<string, number>();

  topics.forEach((topic) => {
    const key = topic.disciplina.toLowerCase();
    const existing = byDisc.get(key) ?? [];
    existing.push(topic);
    byDisc.set(key, existing);
    weights.set(key, Math.max(weights.get(key) ?? 0, topic.weight));
  });

  byDisc.forEach((list) => {
    list.sort((a, b) => b.prioridade - a.prioridade);
  });

  const order = Array.from(byDisc.keys()).sort((a, b) => {
    const weightA = weights.get(a) ?? 0;
    const weightB = weights.get(b) ?? 0;
    if (weightA !== weightB) return weightB - weightA;
    return a.localeCompare(b);
  });

  const output: TopicInput[] = [];
  let pointer = 0;
  let remaining = topics.length;

  while (remaining > 0) {
    const key = order[pointer % order.length];
    pointer += 1;
    const list = byDisc.get(key);
    if (!list || list.length === 0) continue;
    const next = list.shift();
    if (!next) continue;
    output.push(next);
    remaining -= 1;
  }

  return output;
};

const buildDayBuckets = (start: Date, daysAvailable: number, coverageDays: number, consolidationDays: number) => {
  const days: MacroScheduleDay[] = [];
  for (let i = 0; i < daysAvailable; i += 1) {
    const date = addDaysUtc(start, i);
    const phase =
      i < coverageDays
        ? 'coverage'
        : i < coverageDays + consolidationDays
        ? 'consolidation'
        : 'final';
    days.push({
      date: toIsoDate(date),
      phase,
      items: [],
      total_minutes: 0,
      new_count: 0,
      review_count: 0,
      practice_minutes: 0,
    });
  }
  return days;
};

const addItemToDay = (day: MacroScheduleDay, item: MacroScheduleItem) => {
  day.items.push(item);
  day.total_minutes += item.minutes;
  if (item.type === 'new') day.new_count += 1;
  if (item.type === 'review') day.review_count += 1;
  if (item.type === 'practice') day.practice_minutes += item.minutes;
};

const resolveExamDate = (edital: any, start: Date) => {
  if (edital?.data_prova_prevista) {
    const candidate = new Date(edital.data_prova_prevista);
    if (!Number.isNaN(candidate.getTime())) {
      const examKey = resolveDateKey(candidate).key;
      const exam = resolveDateKey(examKey).date;
      if (exam >= start) return exam;
    }
  }
  return null;
};

const normalizeTopicKey = (value?: string | null) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parts = trimmed.split('::').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const discipline = parts[0];
  const subtopic = parts.length > 1 ? parts[parts.length - 1] : null;
  return buildTopicCodeKey(discipline, subtopic);
};

const loadStudiedTopicKeys = async (userId: string): Promise<Set<string>> => {
  if (!userId) return new Set();
  const { rows } = await query<{ topic_code: string | null }>(
    'SELECT DISTINCT topic_code FROM user_stats WHERE user_id = $1',
    [userId]
  );
  const keys = new Set<string>();
  rows.forEach((row) => {
    const key = normalizeTopicKey(row.topic_code);
    if (key) keys.add(key);
  });
  return keys;
};

export async function buildMacroSchedule(params: {
  editalId: string;
  userId: string;
  startDate?: Date | string;
}): Promise<MacroScheduleResult> {
  const resolvedStart = resolveDateKey(params.startDate);
  const start = resolvedStart.date;
  const edital = await editalRepository.findById(params.editalId);
  if (!edital) {
    throw new Error('edital_not_found');
  }

  const examDate = resolveExamDate(edital, start);
  const end = examDate ? addDaysUtc(examDate, -1) : addDaysUtc(start, DEFAULT_CALENDAR_DAYS);
  const daysAvailable = Math.max(1, diffDaysUtc(start, end) + 1);

  const coverageDays = Math.max(1, Math.min(daysAvailable, Math.ceil(daysAvailable * COVERAGE_RATIO)));
  const consolidationDays = Math.max(1, Math.min(daysAvailable - coverageDays, Math.ceil(daysAvailable * CONSOLIDATION_RATIO)));
  const finalDays = Math.max(0, daysAvailable - coverageDays - consolidationDays);

  const autoFormacao = await generateAutoFormacao({ editalId: params.editalId, userId: params.userId });
  let payload = parseJson(autoFormacao.payload) || {};
  const drops = Array.isArray(payload?.drops) ? payload.drops : [];
  const disciplinas = Array.isArray(edital.disciplinas) ? edital.disciplinas : [];
  const weightMap = new Map<string, number>();
  disciplinas.forEach((disc: any) => {
    const name = normalizeText(disc?.nome || disc?.name);
    if (!name) return;
    weightMap.set(name.toLowerCase(), computeDisciplineWeight(disc));
  });

  const topics: TopicInput[] = drops.map((drop: any) => {
    const disciplina = normalizeText(drop?.disciplina) || 'Disciplina';
    const subassunto = normalizeText(drop?.subtopico) || normalizeText(drop?.topic) || 'Conteudo';
    const assunto = normalizeText(drop?.assunto) || subassunto;
    const nivel = Number(drop?.nivel ?? 3) || 3;
    const prioridade = Number(drop?.prioridade ?? 0) || 0;
    const weight = weightMap.get(disciplina.toLowerCase()) ?? 5;
    return { disciplina, assunto, subassunto, nivel, prioridade, weight };
  });

  const studiedKeys = await loadStudiedTopicKeys(params.userId);
  const remainingTopics = topics.filter(
    (topic) => !studiedKeys.has(buildTopicCodeKey(topic.disciplina, topic.subassunto))
  );
  const totalTopics = remainingTopics.length;
  const completedTopics = Math.max(0, topics.length - totalTopics);

  const scheduleTopics = totalTopics > 0 ? remainingTopics : topics;
  if (totalTopics === 0) {
    return {
      summary: {
        edital_id: params.editalId,
        user_id: params.userId,
        banca: edital?.banca ?? null,
        exam_date: examDate ? toIsoDate(examDate) : null,
        days_available: daysAvailable,
        total_topics: 0,
        remaining_topics: 0,
        completed_topics: completedTopics,
        total_minutes: 0,
        min_minutes_per_day: 0,
        coverage_days: coverageDays,
        consolidation_days: consolidationDays,
        final_days: finalDays,
        review_intervals: REVIEW_INTERVALS,
      },
      days: buildDayBuckets(start, daysAvailable, coverageDays, consolidationDays),
    };
  }

  const orderedTopics = interleaveTopics(
    scheduleTopics.sort((a, b) => {
      if (b.prioridade !== a.prioridade) return b.prioridade - a.prioridade;
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.nivel - a.nivel;
    })
  );

  const dayBuckets = buildDayBuckets(start, daysAvailable, coverageDays, consolidationDays);
  const newTopicsPerDay = Math.max(1, Math.ceil(totalTopics / Math.max(1, coverageDays)));
  let assignedCount = 0;

  const assignNewTopic = (topic: TopicInput, dayIndex: number) => {
    const day = dayBuckets[dayIndex];
    const minutes = estimateNewMinutes(topic.nivel);
    addItemToDay(day, {
      disciplina: topic.disciplina,
      assunto: topic.assunto,
      subassunto: topic.subassunto,
      nivel: topic.nivel,
      prioridade: topic.prioridade,
      type: 'new',
      minutes,
    });
  };

  let dayIndex = 0;
  for (const topic of orderedTopics) {
    if (dayIndex >= coverageDays) break;
    assignNewTopic(topic, dayIndex);
    assignedCount += 1;
    if (assignedCount % newTopicsPerDay === 0) {
      dayIndex += 1;
    }
  }

  let pendingTopics = orderedTopics.slice(assignedCount);
  let consolidationIndex = 0;
  while (pendingTopics.length && consolidationIndex < consolidationDays) {
    const targetDay = coverageDays + consolidationIndex;
    const chunk = pendingTopics.splice(0, newTopicsPerDay);
    chunk.forEach((topic) => assignNewTopic(topic, targetDay));
    consolidationIndex += 1;
  }

  const allTopics = orderedTopics.slice(0, assignedCount).concat(pendingTopics);
  const topicDayIndex = new Map<string, number>();
  dayBuckets.forEach((day, idx) => {
    day.items
      .filter((item) => item.type === 'new')
      .forEach((item) => {
        const key = `${item.disciplina}::${item.subassunto}`.toLowerCase();
        topicDayIndex.set(key, idx);
      });
  });

  allTopics.forEach((topic, index) => {
    const key = `${topic.disciplina}::${topic.subassunto}`.toLowerCase();
    const startIndex = topicDayIndex.get(key);
    if (startIndex === undefined) return;

    let hasFinalReview = false;
    REVIEW_INTERVALS.forEach((interval) => {
      const reviewIndex = startIndex + interval;
      if (reviewIndex >= dayBuckets.length) return;
      if (dayBuckets[reviewIndex].phase === 'final') hasFinalReview = true;
      addItemToDay(dayBuckets[reviewIndex], {
        disciplina: topic.disciplina,
        assunto: topic.assunto,
        subassunto: topic.subassunto,
        nivel: topic.nivel,
        prioridade: topic.prioridade,
        type: 'review',
        minutes: estimateReviewMinutes(topic.nivel),
      });
    });

    if (!hasFinalReview && finalDays > 0) {
      const finalStart = Math.max(0, dayBuckets.length - FINAL_REVIEW_WINDOW_DAYS);
      const reviewIndex = Math.min(dayBuckets.length - 1, finalStart + (index % FINAL_REVIEW_WINDOW_DAYS));
      addItemToDay(dayBuckets[reviewIndex], {
        disciplina: topic.disciplina,
        assunto: topic.assunto,
        subassunto: topic.subassunto,
        nivel: topic.nivel,
        prioridade: topic.prioridade,
        type: 'review',
        minutes: estimateReviewMinutes(topic.nivel),
      });
    }
  });

  if (finalDays > 0) {
    for (let i = dayBuckets.length - finalDays; i < dayBuckets.length; i += 1) {
      if (i < 0 || i >= dayBuckets.length) continue;
      addItemToDay(dayBuckets[i], {
        disciplina: 'Pratica',
        assunto: 'Questões',
        subassunto: 'Treino da banca',
        nivel: 3,
        prioridade: 0,
        type: 'practice',
        minutes: PRACTICE_MINUTES_BASE,
      });
    }
  }

  const totalMinutes = dayBuckets.reduce((acc, day) => acc + day.total_minutes, 0);
  const newMinutes = dayBuckets.reduce((acc, day) => {
    const dayNew = day.items.reduce((sum, item) => {
      if (item.type === 'review') return sum;
      return sum + item.minutes;
    }, 0);
    return acc + dayNew;
  }, 0);
  const minMinutesPerDay = newMinutes > 0 ? Math.max(1, Math.ceil(newMinutes / daysAvailable)) : 0;

  return {
    summary: {
      edital_id: params.editalId,
      user_id: params.userId,
      banca: edital?.banca ?? null,
      exam_date: examDate ? toIsoDate(examDate) : null,
      days_available: daysAvailable,
      total_topics: totalTopics,
      remaining_topics: totalTopics,
      completed_topics: completedTopics,
      total_minutes: totalMinutes,
      min_minutes_per_day: minMinutesPerDay,
      coverage_days: coverageDays,
      consolidation_days: consolidationDays,
      final_days: finalDays,
      review_intervals: REVIEW_INTERVALS,
    },
    days: dayBuckets,
  };
}
