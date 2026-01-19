import { buildServer } from '../server';
import { query } from '../db';
import { QueueService } from '../services/queueService';
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

async function main() {
  const app = await buildServer();
  await app.ready();
  const apiPrefix = '/api';

  const userId = await getFirstUserId();
  const discipline = await getOrCreateDiscipline('Direito Administrativo');
  const token = app.jwt.sign({
    sub: userId,
    id: userId,
    role: 'user',
    email: 'qa@edro.local',
  });

  const tutorResponse = await app.inject({
    method: 'POST',
    url: `${apiPrefix}/tutor/session`,
    payload: {
      user_id: userId,
      message: 'Explique controle de constitucionalidade com foco em prova.',
      discipline: discipline.name,
      subtopic: 'Controle de constitucionalidade',
      response_format: 'mapa_mental',
      learning_style: 'visual',
      cognitive: { foco: 3, energia: 3, saturacao: false },
      emotional: { ansiedade: false, frustracao: false, humor: 4 },
      include_recent_errors: true,
      create_drop: {
        enabled: true,
        discipline_id: discipline.id,
        title: 'Drop tutor QA',
        difficulty: 2,
      },
    },
    headers: { authorization: `Bearer ${token}` },
  });
  const tutorJson = tutorResponse.json();

  const mnemonicResponse = await app.inject({
    method: 'POST',
    url: `${apiPrefix}/mnemonics/generate`,
    payload: {
      subtopico: 'Controle de constitucionalidade',
      conteudo: 'Resumo dos tipos de controle e fundamentos.',
      tecnica: 'historia',
      estilo_cognitivo: 'narrativo',
      disciplina_id: discipline.id,
      banca: 'CESPE',
      humor: 3,
      energia: 4,
      variacoes: 2,
    },
    headers: { authorization: `Bearer ${token}` },
  });
  const mnemonicJson = mnemonicResponse.json();
  const mnemonicId = mnemonicJson?.data?.id as string | undefined;

  let mnemonicDetails: any = null;
  if (mnemonicId) {
    const detailsResponse = await app.inject({
      method: 'GET',
      url: `${apiPrefix}/mnemonics/${mnemonicId}`,
    });
    mnemonicDetails = detailsResponse.json();
  }

  let srsLinked = false;
  if (mnemonicId) {
    try {
      const { rows } = await query<{ card_id: string }>(
        `
        SELECT card_id
        FROM srs_card_content_map
        WHERE content_type = 'mnemonic'
          AND content_id = $1
        LIMIT 1
        `,
        [mnemonicId]
      );
      srsLinked = Boolean(rows[0]?.card_id);
    } catch (err) {
      console.warn('[phase4] Falha ao verificar SRS:', (err as any)?.message);
    }
  }

  let feedbackStatus = null;
  if (mnemonicId) {
    const feedbackResponse = await app.inject({
      method: 'POST',
      url: `${apiPrefix}/mnemonics/${mnemonicId}/feedback`,
      payload: { funcionaBem: false, motivo: 'qa_evolucao' },
      headers: { authorization: `Bearer ${token}` },
    });
    feedbackStatus = feedbackResponse.statusCode;
  }

  await sleep(800);

  let versionRow: { id: string; versao: string; motivo: string | null } | null = null;
  if (mnemonicId) {
    const { rows } = await query<{ id: string; versao: string; motivo: string | null }>(
      `
      SELECT id, versao, motivo
      FROM mnemonicos_versions
      WHERE mnemonico_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [mnemonicId]
    );
    versionRow = rows[0] ?? null;
  }

  console.log('PHASE4_RESULTS', {
    tutor: {
      status: tutorResponse.statusCode,
      drop_id: tutorJson?.data?.drop?.id ?? null,
      recent_errors: tutorJson?.data?.used_context?.recentErrors?.length ?? 0,
    },
    mnemonic: {
      status: mnemonicResponse.statusCode,
      id: mnemonicId ?? null,
      variacoes: mnemonicDetails?.data?.versoes_alternativas?.length ?? 0,
      srsLinked,
    },
    evolution: {
      feedbackStatus,
      version: versionRow,
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
