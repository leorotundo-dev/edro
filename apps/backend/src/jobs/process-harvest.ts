import 'dotenv/config';
import { findHarvestByStatus, updateHarvestStatus } from '../repositories/harvestRepository';
import { createBlueprint, findBlueprintsByHarvestId } from '../repositories/blueprintRepository';
import { extractBlueprint } from '../services/ai/extractBlueprint';

/**
 * Job: Processar harvest items pendentes
 * 
 * Fluxo:
 * 1. Buscar harvest items com status PENDING
 * 2. Para cada um, extrair blueprint usando IA
 * 3. Salvar blueprint em exam_blueprints
 * 4. Atualizar status para COMPLETED ou FAILED
 */

interface ProcessingResult {
  harvestId: number;
  success: boolean;
  blueprintId?: number;
  error?: string;
}

async function processHarvestItem(harvestId: number, rawHtml: string): Promise<ProcessingResult> {
  try {
    console.log(`[process-harvest] Processando harvest ${harvestId}...`);

    // 1. Extrair blueprint usando IA
    const extractedBlueprint = await extractBlueprint(rawHtml) as any;
    
    if (!extractedBlueprint) {
      throw new Error('Blueprint extraction returned empty result');
    }

    console.log(`[process-harvest] Blueprint extraído com sucesso para harvest ${harvestId}`);

    // 2. Salvar blueprint no banco
    const blueprint = await createBlueprint({
      harvest_item_id: harvestId,
      exam_code: extractedBlueprint.exam_code,
      banca: extractedBlueprint.banca,
      cargo: extractedBlueprint.cargo,
      disciplina: extractedBlueprint.disciplina,
      blueprint: extractedBlueprint.topics || extractedBlueprint,
      priorities: extractedBlueprint.priorities
    })

    console.log(`[process-harvest] Blueprint salvo com ID ${blueprint.id}`);

    // 3. Atualizar status do harvest para COMPLETED
    await updateHarvestStatus({
      id: harvestId,
      status: 'COMPLETED'
    });

    console.log(`[process-harvest] Harvest ${harvestId} marcado como COMPLETED`);

    return {
      harvestId,
      success: true,
      blueprintId: blueprint.id
    };
  } catch (error) {
    console.error(`[process-harvest] Erro ao processar harvest ${harvestId}:`, error);

    // Marcar como FAILED
    try {
      await updateHarvestStatus({
        id: harvestId,
        status: 'FAILED'
      });
    } catch (updateError) {
      console.error(`[process-harvest] Erro ao atualizar status para FAILED:`, updateError);
    }

    return {
      harvestId,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  console.log('[process-harvest] Iniciando job de processamento de harvest...');

  try {
    // 1. Buscar harvest items pendentes
    const pendingHarvests = await findHarvestByStatus('PENDING');
    console.log(`[process-harvest] Encontrados ${pendingHarvests.length} harvest items pendentes`);

    if (pendingHarvests.length === 0) {
      console.log('[process-harvest] Nenhum harvest pendente para processar');
      return;
    }

    // 2. Processar cada harvest
    const results: ProcessingResult[] = [];
    
    for (const harvest of pendingHarvests) {
      // Atualizar status para PROCESSING
      await updateHarvestStatus({
        id: harvest.id,
        status: 'PROCESSING'
      });

      // Processar
      if (harvest.raw_html) {
        const result = await processHarvestItem(harvest.id, harvest.raw_html);
        results.push(result);
      } else {
        console.warn(`[process-harvest] Harvest ${harvest.id} não possui raw_html`);
        await updateHarvestStatus({
          id: harvest.id,
          status: 'FAILED'
        });
        results.push({
          harvestId: harvest.id,
          success: false,
          error: 'No raw_html provided'
        });
      }

      // Delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 3. Resumo
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[process-harvest] ✅ Processamento concluído`);
    console.log(`[process-harvest] Sucesso: ${successful}, Falhas: ${failed}`);

    return {
      total: results.length,
      successful,
      failed,
      results
    };
  } catch (error) {
    console.error('[process-harvest] Erro fatal no job:', error);
    throw error;
  }
}

// Executar job
main()
  .then((result) => {
    console.log('[process-harvest] Job finalizado com sucesso');
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('[process-harvest] Job falhou:', error);
    process.exit(1);
  });
