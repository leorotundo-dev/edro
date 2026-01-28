import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';

type CatalogItem = {
  production_type: string;
  platform: string;
  format_name: string;
  specs?: Record<string, any>;
  outputs?: string[];
  max_chars?: Record<string, number>;
  best_practices?: string[];
  notes?: string;
  measurability_score?: number;
  measurability_type?: string;
  available_metrics?: string[];
  tracking_tools?: string[];
  attribution_capability?: string;
  ml_performance_score?: Record<string, any>;
  ml_insights?: Record<string, any>;
};

type CatalogResponse = {
  production_type?: string | null;
  items: CatalogItem[];
  platforms: Array<{
    platform: string;
    formats: CatalogItem[];
  }>;
};

let cachedCatalog: CatalogItem[] | null = null;

function normalizeType(value?: string | null) {
  if (!value) return '';
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'eventos') return 'eventos-ativacoes';
  if (trimmed === 'eventos_ativacoes') return 'eventos-ativacoes';
  return trimmed;
}

function loadCatalog(): CatalogItem[] {
  if (cachedCatalog) return cachedCatalog;
  const catalogPath = path.resolve(__dirname, '../data/productionCatalog.json');
  const raw = fs.readFileSync(catalogPath, 'utf-8');
  cachedCatalog = JSON.parse(raw) as CatalogItem[];
  return cachedCatalog;
}

function groupByPlatform(items: CatalogItem[]) {
  const map = new Map<string, CatalogItem[]>();
  items.forEach((item) => {
    const platform = item.platform || 'Geral';
    if (!map.has(platform)) {
      map.set(platform, []);
    }
    map.get(platform)!.push(item);
  });
  return Array.from(map.entries()).map(([platform, formats]) => ({
    platform,
    formats,
  }));
}

export default async function productionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.get(
    '/production/catalog',
    { preHandler: [requirePerm('calendars:read')] },
    async (request: any) => {
      const type = normalizeType(request.query?.type || request.query?.production_type || '');
      const items = loadCatalog();
      const filtered = type ? items.filter((item) => normalizeType(item.production_type) === type) : items;
      const response: CatalogResponse = {
        production_type: type || null,
        items: filtered,
        platforms: groupByPlatform(filtered),
      };
      return response;
    }
  );
}
