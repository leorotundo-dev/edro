import { buildServer } from '../server';
import { query } from '../db';
import { QueueService } from '../services/queueService';
import { saveGeneratedQuestion } from '../repositories/questionRepository';
import { MonitoringService } from '../middleware/monitoring';
import { DatabaseHealthService } from '../services/databaseHealthService';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getFirstUserId(): Promise<string> {
  const { rows } = await query<{ id: string }>(
    'SELECT id FROM users ORDER BY created_at ASC LIMIT 1'
  );
  if (!rows[0]?.id) {
    throw new Error('No users found. Run seed or create a user first.');
  }
  return rows[0].id;
}

async function createNotificationUser(): Promise<string> {
  const email = `notify+${Date.now()}@example.com`;
  const { rows } = await query<{ id: string }>(
    `
    INSERT INTO users (name, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id
    `,
    ['Notify QA', email, 'placeholder']
  );
  return rows[0].id;
}

async function getOrCreateDiscipline(name: string): Promise<{ id: string; name: string }> {
  const { rows } = await query<{ id: string; name: string }>(
    'SELECT id, name FROM disciplines WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [name]
  );
  if (rows[0]) return rows[0];

  const insert = await query<{ id: string; name: string }>(
    'INSERT INTO disciplines (name) VALUES ($1) RETURNING id, name',
    [name]
  );
  return insert.rows[0];
}

async function ensureQuestions(params: {
  discipline: string;
  examBoard: string;
  count: number;
  topic: string;
}) {
  const { rows } = await query<{ count: string }>(
    `
    SELECT COUNT(*)::int AS count
    FROM questoes
    WHERE status = 'active'
      AND discipline = $1
      AND exam_board = $2
    `,
    [params.discipline, params.examBoard]
  );
  const existing = Number(rows[0]?.count ?? 0);
  const missing = Math.max(0, params.count - existing);
  if (missing === 0) return;

  const difficulties = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
  for (let i = 0; i < missing; i += 1) {
    const difficulty = difficulties[i % difficulties.length];
    const index = existing + i + 1;
    await saveGeneratedQuestion(
      {
        question_text: `Questao teste ${index} (${params.discipline})`,
        question_type: 'multiple_choice',
        alternatives: [
          { letter: 'A', text: 'Alternativa A', is_correct: true },
          { letter: 'B', text: 'Alternativa B', is_correct: false },
          { letter: 'C', text: 'Alternativa C', is_correct: false },
          { letter: 'D', text: 'Alternativa D', is_correct: false },
        ],
        correct_answer: 'A',
        explanation: 'Explicacao curta da resposta correta.',
        concepts: ['conceito-basico'],
        cognitive_level: 'remember',
        tags: ['teste'],
        estimated_time_seconds: 60,
        difficulty_score: difficulty,
        references: [],
      },
      params.discipline,
      params.topic,
      params.examBoard,
      'active'
    );
  }
}

async function main() {
  const app = await buildServer();
  await app.ready();
  const apiPrefix = '/api';

  const adminUserId = await getFirstUserId();
  const notificationUserId = await createNotificationUser();
  const discipline = await getOrCreateDiscipline('Direito Constitucional');
  const token = app.jwt.sign({
    sub: adminUserId,
    role: 'admin',
    email: 'admin@edro.local',
  });

  // Tutor -> Drop -> Admin approve flow
  const dropPayload = {
    discipline_id: discipline.id,
    title: 'Drop de teste',
    content: 'Conteudo do drop gerado via tutor para QA.',
    difficulty: 2,
    source_message: 'Teste de criacao de drop',
  };

  const dropResponse = await app.inject({
    method: 'POST',
    url: `${apiPrefix}/tutor/to-drop`,
    payload: dropPayload,
    headers: { authorization: `Bearer ${token}` },
  });
  const dropJson = dropResponse.json();
  if (dropResponse.statusCode !== 201) {
    throw new Error(`Drop creation failed: ${dropResponse.statusCode} ${JSON.stringify(dropJson)}`);
  }
  const dropId = dropJson.data.id as string;

  const listResponse = await app.inject({
    method: 'GET',
    url: `${apiPrefix}/admin/drops?status=draft&origin=tutor&discipline_id=${discipline.id}`,
    headers: { authorization: `Bearer ${token}` },
  });
  const listJson = listResponse.json();
  const listed = Array.isArray(listJson.items)
    ? listJson.items.some((item: any) => item.id === dropId)
    : false;

  const approveResponse = await app.inject({
    method: 'PATCH',
    url: `${apiPrefix}/admin/drops/${dropId}/status`,
    payload: { status: 'published' },
    headers: { authorization: `Bearer ${token}` },
  });
  const approveJson = approveResponse.json();

  // Notifications flow
  const notifyResponse = await app.inject({
    method: 'POST',
    url: `${apiPrefix}/notifications/send`,
    payload: {
      userId: notificationUserId,
      type: 'push',
      title: 'Aviso de teste',
      body: 'Notificacao de teste do fluxo.',
    },
    headers: { authorization: `Bearer ${token}` },
  });
  const notifyJson = notifyResponse.json();

  await sleep(1200);
  const { rows: logRows } = await query<{ id: string; status: string; reason: string | null }>(
    `
    SELECT id, status, reason
    FROM notifications_log
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [notificationUserId]
  );
  const latestLog = logRows[0] ?? null;

  // Simulado flow (questions + adaptive loop)
  const examBoard = 'CESPE';
  const topicCode = 'DC-TEST';
  await ensureQuestions({
    discipline: discipline.name,
    examBoard,
    count: 10,
    topic: topicCode,
  });

  const simuladoResponse = await app.inject({
    method: 'POST',
    url: `${apiPrefix}/simulados`,
    payload: {
      name: `Simulado QA ${new Date().toISOString()}`,
      description: 'Simulado QA automatizado',
      discipline: discipline.name,
      examBoard,
      totalQuestions: 5,
      tipo: 'adaptativo',
      config: {},
      userId: adminUserId,
    },
  });
  const simuladoJson = simuladoResponse.json();
  const simuladoId = simuladoJson.data.id as string;

  const startResponse = await app.inject({
    method: 'POST',
    url: `${apiPrefix}/simulados/${simuladoId}/start`,
    payload: { userId: adminUserId, mode: 'padrao' },
  });
  const startJson = startResponse.json();
  const executionId = startJson.data.executionId as string;
  let currentQuestion = startJson.data.currentQuestion as { questionId: string; difficulty: number };
  const difficultyTrace: number[] = [startJson.data.adaptiveState.currentDifficulty];

  const answerPlan = [false, false, true, true, true];
  for (const isCorrect of answerPlan) {
    if (!currentQuestion?.questionId) break;
    const answerResponse = await app.inject({
      method: 'POST',
      url: `${apiPrefix}/simulados/executions/${executionId}/answer`,
      payload: {
        questionId: currentQuestion.questionId,
        selectedAnswer: isCorrect ? 'A' : 'B',
        timeSpent: 30,
      },
    });
    const answerJson = answerResponse.json();
    difficultyTrace.push(answerJson.data.adaptiveState.currentDifficulty);
    if (answerJson.data.isCompleted) {
      currentQuestion = null as any;
      break;
    }
    currentQuestion = answerJson.data.nextQuestion as { questionId: string; difficulty: number };
  }

  const finishResponse = await app.inject({
    method: 'POST',
    url: `${apiPrefix}/simulados/executions/${executionId}/finish`,
  });
  const finishJson = finishResponse.json();

  console.log('FLOW_RESULTS', {
    drop: {
      id: dropId,
      listed,
      approved: approveResponse.statusCode === 200,
      approvedStatus: approveJson?.data?.status,
    },
    notification: {
      queued: notifyJson?.data?.queued,
      log: latestLog,
    },
    simulado: {
      id: simuladoId,
      executionId,
      difficultyTrace,
      finished: finishResponse.statusCode === 200,
      resultId: finishJson?.data?.resultId,
    },
  });

  await QueueService.shutdownQueues();
  MonitoringService.stopAutoMonitoring();
  DatabaseHealthService.stopHealthMonitoring();
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
