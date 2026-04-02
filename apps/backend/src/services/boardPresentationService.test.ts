import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockGetReporteiConnector, mockSaveFile, mockClaudeCompletion } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockGetReporteiConnector: vi.fn(),
  mockSaveFile: vi.fn(),
  mockClaudeCompletion: vi.fn(),
}));

vi.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

vi.mock('../providers/reportei/reporteiConnector', () => ({
  getReporteiConnector: (...args: any[]) => mockGetReporteiConnector(...args),
}));

vi.mock('../library/storage', () => ({
  saveFile: (...args: any[]) => mockSaveFile(...args),
}));

vi.mock('./ai/claudeService', () => ({
  generateCompletion: (...args: any[]) => mockClaudeCompletion(...args),
}));

import { runBoardPresentationPreflight } from './boardPresentationService';

function buildInstagramSnapshot(overrides?: Record<string, any>) {
  return {
    platform: 'Instagram',
    time_window: '30d',
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    synced_at: '2026-04-01T08:00:00.000Z',
    metrics: {
      'ig:followers_count': { value: 12000, comparison: 11700, delta_pct: 2.56 },
      'ig:new_followers_count': { value: 300 },
      'ig:reach': { value: 84500 },
      'ig:feed_engagement': { value: 4200 },
      ...overrides,
    },
  };
}

function buildLinkedinSnapshot(overrides?: Record<string, any>) {
  return {
    platform: 'LinkedIn',
    time_window: '30d',
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    synced_at: '2026-04-01T09:00:00.000Z',
    metrics: {
      'li:followers_count': { value: 5800, comparison: 5600, delta_pct: 3.57 },
      'li:impressions': { value: 46200 },
      'li:engagement': { value: 1600 },
      ...overrides,
    },
  };
}

describe('boardPresentationService.runBoardPresentationPreflight', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetReporteiConnector.mockReset();
    mockSaveFile.mockReset();
    mockClaudeCompletion.mockReset();
  });

  it('blocks generation when a required followers metric is missing', async () => {
    mockGetReporteiConnector.mockResolvedValue({
      token: 'reportei-token',
      platforms: { instagram_business: 123 },
    });

    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'client-1',
          tenant_id: 'tenant-1',
          name: 'CS Grãos Piauí',
          segment_primary: 'Agro',
          city: 'Teresina',
          uf: 'PI',
        }],
      })
      .mockResolvedValueOnce({
        rows: [
          buildInstagramSnapshot({
            'ig:followers_count': undefined,
          }),
        ],
      });

    const readiness = await runBoardPresentationPreflight({
      tenantId: 'tenant-1',
      clientId: 'client-1',
      periodMonth: '2026-03',
    });

    expect(readiness.status).toBe('blocked');
    expect(readiness.missing_metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: 'Instagram',
          metric: 'Seguidores totais',
        }),
      ]),
    );
    expect(readiness.blocking_reasons).toContain(
      'Existem métricas obrigatórias ausentes no Reportei para gerar a apresentação do Board.',
    );
  });

  it('marks the month as ready when all active supported networks have the required Reportei data', async () => {
    mockGetReporteiConnector.mockResolvedValue({
      token: 'reportei-token',
      platforms: {
        instagram_business: 123,
        linkedin: 456,
      },
    });

    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'client-1',
          tenant_id: 'tenant-1',
          name: 'CS Grãos Piauí',
          segment_primary: 'Agro',
          city: 'Teresina',
          uf: 'PI',
        }],
      })
      .mockResolvedValueOnce({ rows: [buildInstagramSnapshot()] })
      .mockResolvedValueOnce({ rows: [buildLinkedinSnapshot()] });

    const readiness = await runBoardPresentationPreflight({
      tenantId: 'tenant-1',
      clientId: 'client-1',
      periodMonth: '2026-03',
    });

    expect(readiness.status).toBe('ready');
    expect(readiness.missing_metrics).toEqual([]);
    expect(readiness.blocking_reasons).toEqual([]);
    expect(readiness.active_platforms.map((item) => item.label)).toEqual(['Instagram', 'LinkedIn']);
    expect(readiness.last_reportei_snapshot_at).toBe('2026-04-01T09:00:00.000Z');
  });
});
