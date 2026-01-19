import { buildServer } from '../server';
import { query } from '../db';
import { MonitoringService } from '../middleware/monitoring';
import { DatabaseHealthService } from '../services/databaseHealthService';
import { QueueService } from '../services/queueService';

async function getFirstUserId(): Promise<string> {
  const { rows } = await query<{ id: string }>(
    'SELECT id FROM users ORDER BY created_at ASC LIMIT 1'
  );
  if (!rows[0]?.id) {
    throw new Error('No users found. Run seed or create a user first.');
  }
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

async function upsertUserStat(userId: string, topicCode: string) {
  await query(
    `
    INSERT INTO user_stats (
      user_id,
      topic_code,
      correct_count,
      wrong_count,
      streak,
      last_seen_at,
      next_due_at
    ) VALUES ($1, $2, 3, 1, 2, NOW(), NOW() - INTERVAL '1 day')
    ON CONFLICT (user_id, topic_code) DO UPDATE SET
      correct_count = EXCLUDED.correct_count,
      wrong_count = EXCLUDED.wrong_count,
      streak = EXCLUDED.streak,
      last_seen_at = EXCLUDED.last_seen_at,
      next_due_at = EXCLUDED.next_due_at
    `,
    [userId, topicCode]
  );
}

async function main() {
  const app = await buildServer();
  await app.ready();
  const apiPrefix = '/api';

  const adminUserId = await getFirstUserId();
  const discipline = await getOrCreateDiscipline('Direito Constitucional');
  const token = app.jwt.sign({
    sub: adminUserId,
    id: adminUserId,
    role: 'admin',
    email: 'admin@edro.local',
  });

  const dropPayload = {
    discipline_id: discipline.id,
    title: 'Drop SRS QA',
    content: 'Conteudo do drop para validar SRS e daily plan.',
    difficulty: 2,
    source_message: 'Teste automatizado fase 2',
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
  const topicCode = `QA-PLAN-${Date.now()}`;

  await query('UPDATE drops SET topic_code = $2 WHERE id = $1', [dropId, topicCode]);

  await app.inject({
    method: 'PATCH',
    url: `${apiPrefix}/admin/drops/${dropId}/status`,
    payload: { status: 'published' },
    headers: { authorization: `Bearer ${token}` },
  });

  const enrollResponse = await app.inject({
    method: 'POST',
    url: `${apiPrefix}/srs/enroll`,
    payload: { dropId },
    headers: { authorization: `Bearer ${token}` },
  });
  const enrollJson = enrollResponse.json();
  const enrolledCardId = enrollJson.card?.id as string | undefined;

  const todayResponse = await app.inject({
    method: 'GET',
    url: `${apiPrefix}/srs/today`,
    headers: { authorization: `Bearer ${token}` },
  });
  const todayJson = todayResponse.json();
  const todayCard = Array.isArray(todayJson.cards)
    ? todayJson.cards.find((card: any) => card.drop_id === dropId)
    : null;
  const cardId = enrolledCardId || todayCard?.id;

  const reviewResponse = cardId
    ? await app.inject({
        method: 'POST',
        url: `${apiPrefix}/srs/review`,
        payload: { cardId, grade: 4 },
        headers: { authorization: `Bearer ${token}` },
      })
    : null;

  const intervalUpsert = await app.inject({
    method: 'POST',
    url: `${apiPrefix}/srs/intervals`,
    payload: {
      subtopico: topicCode,
      interval_multiplier: 1.2,
      ease_multiplier: 1.05,
    },
    headers: { authorization: `Bearer ${token}` },
  });

  const intervalGet = await app.inject({
    method: 'GET',
    url: `${apiPrefix}/srs/intervals?subtopico=${encodeURIComponent(topicCode)}`,
    headers: { authorization: `Bearer ${token}` },
  });

  await upsertUserStat(adminUserId, topicCode);

  const planResponse = await app.inject({
    method: 'GET',
    url: `${apiPrefix}/plan/daily?limit=5`,
    headers: { authorization: `Bearer ${token}` },
  });
  const planJson = planResponse.json();
  const items = Array.isArray(planJson?.data?.items) ? planJson.data.items : [];
  const reviewItems = items.filter((item: any) => item.isReview);

  console.log('PHASE2_RESULTS', {
    srs: {
      enrolled: enrollResponse.statusCode === 201,
      cardId,
      todayCount: Array.isArray(todayJson.cards) ? todayJson.cards.length : 0,
      reviewed: reviewResponse?.statusCode === 200,
    },
    intervals: {
      upserted: intervalUpsert.statusCode === 200,
      fetched: intervalGet.statusCode === 200,
    },
    plan: {
      ok: planResponse.statusCode === 200,
      items: items.length,
      reviewItems: reviewItems.length,
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
