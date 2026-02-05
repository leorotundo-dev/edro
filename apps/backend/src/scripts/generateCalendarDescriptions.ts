/**
 * Script para gerar descrições de eventos do calendário usando IA
 *
 * Executa: npx tsx src/scripts/generateCalendarDescriptions.ts
 *
 * Opções:
 *   --limit=N     Processar apenas N eventos (para teste)
 *   --start=N     Começar a partir do evento N
 *   --dry-run     Não salvar, apenas mostrar preview
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateEventDescription } from '../services/calendarDescriptionService';

interface CalendarEvent {
  data: string;
  evento: string;
  evento_key: string;
  codigo_evento: string;
  tipo_evento: string;
  oficial: string;
  abrangencia: string;
  territorio: string;
  cidade: string;
  periodicidade: string;
  nivel_impacto: string;
  janela_ativacao: string;
  momento_no_ano: string;
  abordagem_editorial: string;
  cta_sugerido: string;
  canais_sugeridos: string;
  formato_sugerido: string;
  tags_editoriais: string;
  score_relevancia: string;
  score_editorial: string;
  descricao_ai?: string;
  origem_ai?: string;
  curiosidade_ai?: string;
}

function parseArgs(): { limit?: number; start?: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  let limit: number | undefined;
  let start: number | undefined;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--start=')) {
      start = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  return { limit, start, dryRun };
}

function parseCSV(content: string, delimiter = ';'): string[][] {
  const lines = content.split('\n');
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function escapeCSV(value: string): string {
  if (!value) return '';
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const { limit, start, dryRun } = parseArgs();

  console.log('🤖 GERADOR DE DESCRIÇÕES DE EVENTOS COM IA\n');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('⚠️  MODO DRY-RUN: Nenhum arquivo será salvo\n');
  }

  // Ler arquivo limpo
  const inputPath = path.resolve(__dirname, '../../../../docs/EDRO_CALENDARIO_2026_LIMPO.csv');
  const outputPath = path.resolve(__dirname, '../../../../docs/EDRO_CALENDARIO_2026_COM_DESCRICOES.csv');

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Arquivo não encontrado: ${inputPath}`);
    process.exit(1);
  }

  console.log(`📂 Lendo: ${inputPath}\n`);
  const content = fs.readFileSync(inputPath, 'utf-8');
  const rows = parseCSV(content, ';');

  const header = rows[0];
  const events: CalendarEvent[] = [];

  // Verificar se já existe coluna de descrição
  let descricaoColIndex = header.indexOf('descricao_ai');
  const hasDescricaoCol = descricaoColIndex >= 0;

  if (!hasDescricaoCol) {
    header.push('descricao_ai', 'origem_ai', 'curiosidade_ai');
  }

  // Mapear eventos
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    events.push({
      data: row[0],
      evento: row[1],
      evento_key: row[2],
      codigo_evento: row[3],
      tipo_evento: row[4],
      oficial: row[5],
      abrangencia: row[6],
      territorio: row[7],
      cidade: row[8],
      periodicidade: row[9],
      nivel_impacto: row[10] || '',
      janela_ativacao: row[11] || '',
      momento_no_ano: row[12] || '',
      abordagem_editorial: row[13] || '',
      cta_sugerido: row[14] || '',
      canais_sugeridos: row[15] || '',
      formato_sugerido: row[16] || '',
      tags_editoriais: row[17] || '',
      score_relevancia: row[18] || '',
      score_editorial: row[19] || '',
      descricao_ai: hasDescricaoCol ? row[20] : undefined,
      origem_ai: hasDescricaoCol ? row[21] : undefined,
      curiosidade_ai: hasDescricaoCol ? row[22] : undefined,
    });
  }

  console.log(`📊 Total de eventos: ${events.length}`);

  // Filtrar eventos únicos (mesmo evento em datas diferentes precisa só de 1 descrição)
  const uniqueEvents = new Map<string, CalendarEvent>();
  for (const event of events) {
    const key = event.evento.toLowerCase().trim();
    if (!uniqueEvents.has(key)) {
      uniqueEvents.set(key, event);
    }
  }

  console.log(`📊 Eventos únicos (para gerar descrição): ${uniqueEvents.size}`);

  // Filtrar eventos sem descrição
  const eventsToProcess = Array.from(uniqueEvents.values()).filter(
    e => !e.descricao_ai || e.descricao_ai.trim() === ''
  );

  console.log(`📊 Eventos sem descrição: ${eventsToProcess.length}`);

  // Aplicar start e limit
  let processQueue = eventsToProcess;
  if (start !== undefined) {
    processQueue = processQueue.slice(start);
    console.log(`📊 Começando do evento ${start}`);
  }
  if (limit !== undefined) {
    processQueue = processQueue.slice(0, limit);
    console.log(`📊 Limitado a ${limit} eventos`);
  }

  console.log(`\n🚀 Processando ${processQueue.length} eventos...\n`);
  console.log('='.repeat(60));

  // Processar eventos
  const descriptions = new Map<string, { descricao: string; origem?: string; curiosidade?: string }>();
  let processed = 0;
  let errors = 0;

  for (const event of processQueue) {
    processed++;
    const progress = `[${processed}/${processQueue.length}]`;

    console.log(`\n${progress} ${event.evento}`);
    console.log(`    Data: ${event.data} | Tipo: ${event.tipo_evento}`);

    if (dryRun) {
      console.log(`    ⏭️  Pulando (dry-run)`);
      continue;
    }

    try {
      const result = await generateEventDescription({
        evento: event.evento,
        data: event.data,
        tipo_evento: event.tipo_evento,
        tags: event.tags_editoriais,
      });

      if (result.error) {
        console.log(`    ❌ Erro: ${result.error}`);
        errors++;
      } else {
        console.log(`    ✅ ${result.descricao.substring(0, 80)}...`);
        descriptions.set(event.evento.toLowerCase().trim(), {
          descricao: result.descricao,
          origem: result.origem,
          curiosidade: result.curiosidade,
        });
      }
    } catch (error) {
      console.log(`    ❌ Erro: ${error}`);
      errors++;
    }

    // Delay para evitar rate limit (ajuste conforme necessário)
    await sleep(300);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Processamento concluído!`);
  console.log(`   Eventos processados: ${processed}`);
  console.log(`   Descrições geradas: ${descriptions.size}`);
  console.log(`   Erros: ${errors}`);

  if (dryRun) {
    console.log('\n⚠️  Modo dry-run - nenhum arquivo foi salvo.');
    process.exit(0);
  }

  // Aplicar descrições a todos os eventos
  console.log('\n📝 Aplicando descrições aos eventos...');

  for (const event of events) {
    const key = event.evento.toLowerCase().trim();
    const desc = descriptions.get(key);

    if (desc) {
      event.descricao_ai = desc.descricao;
      event.origem_ai = desc.origem || '';
      event.curiosidade_ai = desc.curiosidade || '';
    }
  }

  // Gerar CSV
  console.log('\n💾 Salvando arquivo...');

  const outputLines: string[] = [header.join(';')];

  for (const event of events) {
    const row = [
      event.data,
      event.evento,
      event.evento_key,
      event.codigo_evento,
      event.tipo_evento,
      event.oficial,
      event.abrangencia,
      event.territorio,
      event.cidade,
      event.periodicidade,
      event.nivel_impacto,
      event.janela_ativacao,
      event.momento_no_ano,
      event.abordagem_editorial,
      event.cta_sugerido,
      event.canais_sugeridos,
      event.formato_sugerido,
      event.tags_editoriais,
      event.score_relevancia,
      event.score_editorial,
      escapeCSV(event.descricao_ai || ''),
      escapeCSV(event.origem_ai || ''),
      escapeCSV(event.curiosidade_ai || ''),
    ];
    outputLines.push(row.join(';'));
  }

  const bom = '\uFEFF';
  fs.writeFileSync(outputPath, bom + outputLines.join('\n'), 'utf-8');

  console.log(`\n✅ Arquivo salvo: ${outputPath}`);

  // Estatísticas finais
  const withDescription = events.filter(e => e.descricao_ai && e.descricao_ai.trim()).length;
  console.log(`\n📊 Estatísticas finais:`);
  console.log(`   Total de eventos: ${events.length}`);
  console.log(`   Com descrição: ${withDescription}`);
  console.log(`   Sem descrição: ${events.length - withDescription}`);
  console.log(`   Cobertura: ${((withDescription / events.length) * 100).toFixed(1)}%`);

  process.exit(0);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
