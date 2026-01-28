import type { CalendarEvent } from '../types';
import type {
  ClientKnowledge,
  ClientKnowledgeRequest,
  LocalEventsProvider,
  LocalEventsRequest,
  KnowledgeBaseProvider,
} from './contracts';
import { TrendAggregatorSimple } from './trends/trendAggregatorSimple';
import { YouTubeTrendingProvider } from './trends/youtubeTrendingProvider';
import { GoogleTrendsProvider } from './trends/googleTrendsProvider';
import { ReporteiPerformanceProvider } from './reportei/reporteiPerformanceProvider';
import { LiveBoostEngineDb } from './liveBoostEngineDb';
import { listApprovedEventsForYear } from '../repos/eventsRepo';
import { getClientById } from '../repos/clientsRepo';
import { query } from '../db';
import { buildClientKnowledgeFromRow } from './clientKnowledge';

export const localEventsProvider: LocalEventsProvider = {
  name: 'local_events_stub',
  async health() {
    return { ok: true };
  },
  async getLocalEvents(request: LocalEventsRequest): Promise<CalendarEvent[]> {
    const country = request.locality.country || 'BR';
    return listApprovedEventsForYear({
      tenantId: request.tenant_id ?? null,
      year: request.year,
      country,
    });
  },
};

export const trendProviders = [new GoogleTrendsProvider(), new YouTubeTrendingProvider()];

export const trendAggregator = new TrendAggregatorSimple(trendProviders);

export const performanceProvider = new ReporteiPerformanceProvider();

export const knowledgeBaseProvider: KnowledgeBaseProvider = {
  name: 'knowledge_base_db',
  async health() {
    return { ok: true };
  },
  async getClientKnowledge(request: ClientKnowledgeRequest): Promise<ClientKnowledge> {
    if (!request?.client_id) return { notes: [], tags: [] };
    let row: any = null;

    if (request.tenant_id) {
      row = await getClientById(request.tenant_id, request.client_id);
    } else {
      const { rows } = await query<any>(`SELECT * FROM clients WHERE id=$1 LIMIT 1`, [
        request.client_id,
      ]);
      row = rows[0] ?? null;
    }

    return buildClientKnowledgeFromRow(row);
  },
};

export const liveBoostEngine = new LiveBoostEngineDb();
