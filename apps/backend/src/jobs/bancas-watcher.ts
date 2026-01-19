import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { HarvestService } from '../services/harvestService';

interface BancaConfig {
  id: string;
  banca?: string;
  limit?: number;
  enabled?: boolean;
  config?: Record<string, any>;
}

async function main() {
  const configPath = path.join(process.cwd(), 'config', 'bancas.yml');
  if (!fs.existsSync(configPath)) {
    console.error(`[bancas-watcher] Config não encontrada em ${configPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  const configs = yaml.load(raw) as BancaConfig[];

  if (!Array.isArray(configs)) {
    console.error('[bancas-watcher] Config YAML inválida (esperado array)');
    process.exit(1);
  }

  for (const banca of configs) {
    if (banca.enabled === false) continue;
    if (!banca.id) {
      console.warn('[bancas-watcher] Entrada sem id, ignorando');
      continue;
    }

    const limit = banca.limit || 10;
    console.log(`[bancas-watcher] Rodando banca ${banca.id} (limit=${limit})`);

    try {
      // Injetar config customizada no HarvestService via source.config? Aqui só passamos limit.
      const result = await HarvestService.harvestFromSource(
        banca.id,
        limit,
        { ...(banca.config || {}), banca: banca.banca || banca.id }
      );
      console.log(
        `[bancas-watcher] ${banca.id}: ${result.harvested_count} itens, sucesso=${result.success}`
      );
      if (result.errors.length) {
        console.log(`[bancas-watcher] Erros ${banca.id}:`, result.errors);
      }
    } catch (err) {
      console.error(`[bancas-watcher] Erro na banca ${banca.id}:`, err);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[bancas-watcher] Erro fatal:', err);
    process.exit(1);
  });
