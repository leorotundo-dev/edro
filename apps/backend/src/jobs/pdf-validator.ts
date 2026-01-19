import 'dotenv/config';
import { query } from '../db';
import { validatePdfUrl } from '../services/pdfValidator';

/**
 * Job: validar PDFs antes de processar com IA
 * Estratégia:
 *  - busca harvested_content com URL PDF e status pendente/processing
 *  - valida primeira página para keywords de edital
 *  - marca como invalid_pdf quando não parecer edital
 */

async function main() {
  console.log('[pdf-validator] Iniciando validação de PDFs...');

  const { rows } = await query<{ id: string; url: string }>(
    `
      SELECT id, url
      FROM harvested_content
      WHERE (status ILIKE 'pending' OR status ILIKE 'processing')
        AND (url ILIKE '%.pdf')
      ORDER BY created_at DESC
      LIMIT 50
    `
  );

  if (rows.length === 0) {
    console.log('[pdf-validator] Nenhum PDF pendente encontrado.');
    return;
  }

  for (const row of rows) {
    console.log(`[pdf-validator] Validando ${row.url} (id=${row.id})`);
    try {
      const result = await validatePdfUrl(row.url);
      const metadataPatch: Record<string, any> = {};
      if (result.classification) metadataPatch.pdf_classification = result.classification;
      if (!result.isValid && result.reason) metadataPatch.pdf_reason = result.reason;

      if (!result.isValid) {
        console.log(`[pdf-validator] Marcando como invalid_pdf (${result.reason})`);
        await query(
          `UPDATE harvested_content SET status = 'invalid_pdf', metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb WHERE id = $1`,
          [row.id, JSON.stringify(metadataPatch)]
        );
      } else {
        if (Object.keys(metadataPatch).length > 0) {
          await query(
            `UPDATE harvested_content SET status = 'validated_pdf', metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb WHERE id = $1`,
            [row.id, JSON.stringify(metadataPatch)]
          );
        } else {
          await query(
            `UPDATE harvested_content SET status = 'validated_pdf' WHERE id = $1`,
            [row.id]
          );
        }
      }
    } catch (err) {
      console.error('[pdf-validator] Erro ao validar', row.url, err);
    }
  }

  console.log('[pdf-validator] Finalizado.');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[pdf-validator] Erro fatal:', err);
    process.exit(1);
  });

