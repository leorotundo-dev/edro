type IdRow = { id: string };

async function main() {
  process.env.DOTENV_CONFIG_PATH = 'apps/backend/.env';
  const dotenv = await import('dotenv');
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH });

  const { query } = await import('../db');
  const { buildServer } = await import('../server');

  const { rows: editalRows } = await query<IdRow>(
    'SELECT id FROM editais ORDER BY created_at DESC LIMIT 1'
  );
  const { rows: userRows } = await query<IdRow>(
    'SELECT id FROM users ORDER BY created_at DESC LIMIT 1'
  );

  const editalId = editalRows[0]?.id;
  const userId = userRows[0]?.id;

  console.log(`[phase5] editalId=${editalId || 'N/A'} userId=${userId || 'N/A'}`);

  process.env.DEV_BYPASS_AUTH = 'true';
  process.env.ENABLE_WORKERS = 'false';

  const app = await buildServer();

  try {
    const heatmap = await app.inject({
      method: 'GET',
      url: '/api/editais/reports/heatmap-probabilidade?limit=5',
    });
    console.log(`[phase5] heatmap status=${heatmap.statusCode}`);

    if (editalId) {
      const cacheResp = await app.inject({
        method: 'GET',
        url: `/api/editais/${editalId}/cache`,
      });
      console.log(`[phase5] cache status=${cacheResp.statusCode}`);

      if (userId) {
        const autoForm = await app.inject({
          method: 'GET',
          url: `/api/editais/${editalId}/auto-formacoes?user_id=${userId}`,
        });
        console.log(`[phase5] auto-formacoes status=${autoForm.statusCode}`);
      } else {
        console.log('[phase5] auto-formacoes skipped: userId not found');
      }
    } else {
      console.log('[phase5] cache/auto-formacoes skipped: editalId not found');
    }

    if (userId) {
      const reccoResp = await app.inject({
        method: 'POST',
        url: '/api/recco/trail/generate',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({
          user_id: userId,
          tempo_disponivel: 30,
          debug: true,
        }),
      });
      console.log(`[phase5] recco status=${reccoResp.statusCode}`);
    } else {
      console.log('[phase5] recco skipped: userId not found');
    }
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[phase5] validation error:', err);
    process.exit(1);
  });
