import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fetchHtml } from '../adapters/harvest/fetchHtml';
import { listEnabledSources, HarvestSource } from '../adapters/harvest/parseSource';

async function main() {
  const sourcesPath = path.join(__dirname, '..', 'adapters', 'harvest', 'sources.json');
  const raw = fs.readFileSync(sourcesPath, 'utf-8');
  const sources = JSON.parse(raw) as HarvestSource[];

  const enabled = listEnabledSources(sources);

  console.log('[harvest] Fontes habilitadas:', enabled.map((s) => s.id));

  // Exemplo de fetch de HTML da primeira fonte habilitada (pode ser ajustado depois)
  const first = enabled[0];
  if (!first) {
    console.log('[harvest] Nenhuma fonte habilitada, finalizando.');
    return;
  }

  const testUrl = first.baseUrl;
  console.log('[harvest] Buscando HTML de:', testUrl);
  const html = await fetchHtml(testUrl);

  console.log('[harvest] HTML recebido (primeiros 500 chars):');
  console.log(html.slice(0, 500));
}

main()
  .catch((err) => {
    console.error('[harvest] Erro no job:', err);
    process.exit(1);
  })
  .finally(async () => {
    // Fechar conexão com banco se necessário
    console.log('[harvest] Job finalizado');
  });
