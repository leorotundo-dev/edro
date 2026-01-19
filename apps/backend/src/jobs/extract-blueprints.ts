import 'dotenv/config';
import { pool, query } from '../db';
import { extractBlueprint } from '../services/ai/extractBlueprint';

interface HarvestItem {
  id: number;
  source: string;
  url: string;
  raw_html: string;
  status: string;
}

async function main() {
  console.log('[extract-blueprints] Iniciando job...');

  const { rows } = await query<HarvestItem>(
    `
    SELECT id, source, url, raw_html, status
    FROM harvest_items
    WHERE status = 'PENDING'
    ORDER BY id ASC
    LIMIT 10
    `
  );

  if (rows.length === 0) {
    console.log('[extract-blueprints] Nenhum harvest_item PENDING encontrado.');
    await pool.end();
    return;
  }

  console.log(`[extract-blueprints] Encontrados ${rows.length} itens.`);

  for (const item of rows) {
    console.log(`[extract-blueprints] Processando id=${item.id}`);

    try {
      const blueprint = await extractBlueprint(item.raw_html) as any;

      await query(
        `
        INSERT INTO exam_blueprints (
          harvest_item_id,
          exam_code,
          banca,
          cargo,
          disciplina,
          blueprint,
          priorities
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          item.id,
          null,
          blueprint.banca,
          blueprint.cargo ?? null,
          null,
          JSON.stringify(blueprint),
          null
        ]
      );

      await query(
        `
        UPDATE harvest_items
        SET status = $1, processed_at = NOW()
        WHERE id = $2
        `,
        ['BLUEPRINT_DONE', item.id]
      );

      console.log(`[extract-blueprints] Sucesso para id=${item.id}`);
    } catch (err) {
      console.error(`[extract-blueprints] Erro para id=${item.id}:`, err);
      await query(
        `UPDATE harvest_items SET status = $1, processed_at = NOW() WHERE id = $2`,
        ['BLUEPRINT_ERROR', item.id]
      );
    }
  }

  console.log('[extract-blueprints] Finalizado.');
  await pool.end();
}

main().catch((err) => {
  console.error('[extract-blueprints] Erro fatal:', err);
  process.exit(1);
});
