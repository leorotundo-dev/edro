import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

// ── Hoisted mocks ──
const { mockQuery, mockRepoFns } = vi.hoisted(() => {
  const fn = vi.fn;
  return {
    mockQuery: fn().mockResolvedValue({ rows: [] }),
    mockRepoFns: {
      createBriefing: fn().mockResolvedValue('test-briefing-id'),
      createBriefingStages: fn().mockResolvedValue(undefined),
      createCopyVersion: fn().mockResolvedValue('test-copy-id'),
      createNotification: fn().mockResolvedValue('test-notif-id'),
      createTask: fn().mockResolvedValue('test-task-id'),
      ensureBriefingStages: fn().mockResolvedValue(undefined),
      getBriefingById: fn().mockResolvedValue(null),
      getOrCreateClientByName: fn().mockResolvedValue('test-client-id'),
      getTaskById: fn().mockResolvedValue(null),
      listAllTasks: fn().mockResolvedValue([]),
      listBriefings: fn().mockResolvedValue([]),
      listBriefingStages: fn().mockResolvedValue([]),
      listCopyVersions: fn().mockResolvedValue([]),
      listTasks: fn().mockResolvedValue([]),
      updateBriefingStageStatus: fn().mockResolvedValue(undefined),
      updateBriefingStatus: fn().mockResolvedValue(undefined),
      updateTaskStatus: fn().mockResolvedValue(undefined),
      deleteBriefing: fn().mockResolvedValue(undefined),
      archiveBriefing: fn().mockResolvedValue(undefined),
      listEdroClients: fn().mockResolvedValue([]),
      getBriefingTimeline: fn().mockResolvedValue([]),
    },
  };
});

vi.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
  pool: { connect: vi.fn(), end: vi.fn() },
  db: { query: (...args: any[]) => mockQuery(...args) },
}));

vi.mock('../env', () => ({
  env: {
    DATABASE_URL: 'postgres://localhost:5432/test',
    JWT_SECRET: 'test-secret-key-long-enough',
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    OPENAI_API_KEY: 'test',
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    OPENAI_MODEL: 'gpt-4o-mini',
    ANTHROPIC_MODEL: 'claude-sonnet-4-5-20250929',
    ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
  },
}));

vi.mock('../services/ai/copyService', () => ({
  generateCopy: vi.fn().mockResolvedValue({ output: '{"headline":"Test"}' }),
  generateCollaborativeCopy: vi.fn(),
  generateCopyWithValidation: vi.fn(),
  generatePremiumCopy: vi.fn(),
  getOrchestratorInfo: vi.fn().mockReturnValue({ model: 'test', provider: 'test' }),
  TaskType: {},
}));
vi.mock('../services/adCreativeService', () => ({ generateAdCreative: vi.fn() }));
vi.mock('../services/notificationService', () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/stageNotificationTemplates', () => ({
  buildStageChangeEmail: vi.fn().mockReturnValue({ subject: 'Test', text: 'Test', html: '<p>Test</p>' }),
}));
vi.mock('../library/storage', () => ({
  saveFile: vi.fn().mockResolvedValue('https://s3.example.com/file.jpg'),
  buildKey: vi.fn().mockReturnValue('test/key'),
}));
vi.mock('../clientIntelligence/worker', () => ({
  refreshAllClientsForTenant: vi.fn().mockResolvedValue({ refreshed: 0, errors: 0 }),
}));
vi.mock('../repositories/edroBriefingRepository', () => mockRepoFns);
vi.mock('../platformProfiles', () => ({
  getPlatformProfile: vi.fn().mockReturnValue(null),
  PLATFORM_PROFILES: {},
}));
vi.mock('../repos/clientsRepo', () => ({
  getClientById: vi.fn().mockResolvedValue(null),
}));
vi.mock('../providers/clientKnowledge', () => ({
  buildClientKnowledgeFromRow: vi.fn().mockReturnValue({}),
}));
vi.mock('../ai/knowledgePrompt', () => ({
  buildClientKnowledgeBlock: vi.fn().mockReturnValue(''),
}));
vi.mock('@edro/shared/workflow', () => ({
  WORKFLOW_STAGES: ['briefing', 'copy_ia', 'aprovacao', 'producao', 'entrega', 'done'],
  getNextStage: vi.fn().mockReturnValue('producao'),
  getStageIndex: vi.fn().mockReturnValue(0),
  isWorkflowStage: vi.fn().mockReturnValue(true),
  getStageUI: vi.fn().mockReturnValue({ label: 'Test', color: '#000' }),
}));

import edroRoutes from './edro';

let app: FastifyInstance;
let authToken: string;

beforeAll(async () => {
  app = fastify({ logger: false });
  await app.register(jwt, { secret: 'test-secret-key-long-enough' });
  await app.register(edroRoutes, { prefix: '/api' });
  await app.ready();
  authToken = app.jwt.sign({
    sub: 'user-123',
    id: 'user-123',
    email: 'test@edro.digital',
    role: 'admin',
    tenant_id: '81fe2f7f-69d7-441a-9a2e-5c4f5d4c5cc5',
  });
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  // Full reset: clears call history AND the once-queue
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
  // Reset repo fns but re-apply defaults
  mockRepoFns.createBriefing.mockReset().mockResolvedValue('test-briefing-id');
  mockRepoFns.createBriefingStages.mockReset().mockResolvedValue(undefined);
  mockRepoFns.createCopyVersion.mockReset().mockResolvedValue('test-copy-id');
  mockRepoFns.createNotification.mockReset().mockResolvedValue('test-notif-id');
  mockRepoFns.createTask.mockReset().mockResolvedValue('test-task-id');
  mockRepoFns.ensureBriefingStages.mockReset().mockResolvedValue(undefined);
  mockRepoFns.getBriefingById.mockReset().mockResolvedValue(null);
  mockRepoFns.getOrCreateClientByName.mockReset().mockResolvedValue('test-client-id');
  mockRepoFns.getTaskById.mockReset().mockResolvedValue(null);
  mockRepoFns.listAllTasks.mockReset().mockResolvedValue([]);
  mockRepoFns.listBriefings.mockReset().mockResolvedValue([]);
  mockRepoFns.listBriefingStages.mockReset().mockResolvedValue([]);
  mockRepoFns.listCopyVersions.mockReset().mockResolvedValue([]);
  mockRepoFns.listTasks.mockReset().mockResolvedValue([]);
  mockRepoFns.updateBriefingStageStatus.mockReset().mockResolvedValue(undefined);
  mockRepoFns.updateBriefingStatus.mockReset().mockResolvedValue(undefined);
  mockRepoFns.updateTaskStatus.mockReset().mockResolvedValue(undefined);
  mockRepoFns.deleteBriefing.mockReset().mockResolvedValue(undefined);
  mockRepoFns.archiveBriefing.mockReset().mockResolvedValue(undefined);
  mockRepoFns.listEdroClients.mockReset().mockResolvedValue([]);
  mockRepoFns.getBriefingTimeline.mockReset().mockResolvedValue([]);
});

// ─── Tests ──────────────────────────────────────────────────────

describe('Authentication', () => {
  it('blocks unauthenticated requests', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/edro/briefings' });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).success).toBe(false);
  });

  it('allows public approval endpoints without auth', async () => {
    // Should not 401 — instead 404 because token not found
    const res = await app.inject({
      method: 'GET',
      url: '/api/edro/public/approval?token=test-token-public-access-check',
    });
    expect(res.statusCode).not.toBe(401);
  });
});

describe('GET /api/edro/metrics', () => {
  it('returns aggregated metrics', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: 42 }] })
      .mockResolvedValueOnce({ rows: [{ status: 'active', count: 10 }] })
      .mockResolvedValueOnce({ rows: [{ stage: 'copy_ia', avg_hours: 12.5 }] })
      .mockResolvedValueOnce({ rows: [{ count: 100 }] })
      .mockResolvedValueOnce({ rows: [{ type: 'copy', count: 80 }] })
      .mockResolvedValueOnce({ rows: [{ count: 5 }] })
      .mockResolvedValueOnce({ rows: [{ stage: 'aprovacao', count: 3 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: 2 }] })
      .mockResolvedValueOnce({ rows: [{ current_stage: 'copy_ia', count: 5 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/edro/metrics',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(42);
    expect(body.data.totalCopies).toBe(100);
    expect(body.data.overdue).toBe(2);
    expect(Array.isArray(body.data.reporteiPlatforms)).toBe(true);
  });
});

describe('GET /api/edro/briefings', () => {
  it('returns briefings list', async () => {
    mockRepoFns.listBriefings.mockResolvedValueOnce({
      rows: [{ id: 'b1', title: 'Test', status: 'active' }],
      total: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/edro/briefings',
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data[0].title).toBe('Test');
  });
});

describe('PATCH /api/edro/copies/:copyId/feedback', () => {
  it('updates copy score and feedback', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'copy-1' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/edro/copies/550e8400-e29b-41d4-a716-446655440000/feedback',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { score: 4, feedback: 'Great', status: 'approved' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('rejects invalid score (out of range)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/edro/copies/550e8400-e29b-41d4-a716-446655440000/feedback',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { score: 10 },
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe('Public Approval Portal', () => {
  it('GET returns briefing copies for valid token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        briefing_id: 'b1',
        title: 'Campaign XYZ',
        client_name: 'Test Client',
        client_name_from_client: null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }],
    });
    mockRepoFns.listCopyVersions.mockResolvedValueOnce([
      { id: 'c1', output: '{"headline":"Promo!"}', language: 'pt-BR', created_at: '2025-01-01' },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/edro/public/approval?token=a1b2c3d4e5f6g7h8i9j0k1l2m3n4',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.briefingTitle).toBe('Campaign XYZ');
    expect(body.data.copies).toHaveLength(1);
  });

  it('GET returns 404 for invalid/expired token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/edro/public/approval?token=expired-or-invalid-token-here-1234',
    });

    expect(res.statusCode).toBe(404);
  });

  it('POST approves a copy', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'tok-1', briefing_id: 'b1', client_name: 'Client' }] })
      .mockResolvedValueOnce({ rows: [] })  // UPDATE copy status
      .mockResolvedValueOnce({ rows: [] })  // promoteStageIfPending
      .mockResolvedValueOnce({ rows: [] }); // mark token used

    const res = await app.inject({
      method: 'POST',
      url: '/api/edro/public/approval',
      payload: {
        token: 'valid-token-string-at-least-twenty-chars',
        copyId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'approve',
        comments: 'Looks great!',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.action).toBe('approve');
  });

  it('POST rejects a copy', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'tok-2', briefing_id: 'b2', client_name: 'C2' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await app.inject({
      method: 'POST',
      url: '/api/edro/public/approval',
      payload: {
        token: 'reject-token-string-minimum-twenty-chars',
        copyId: '550e8400-e29b-41d4-a716-446655440001',
        action: 'reject',
        comments: 'Needs work.',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.action).toBe('reject');
  });
});

describe('Templates', () => {
  it('GET returns templates list', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 't1', name: 'Social', category: 'social' },
        { id: 't2', name: 'Ads', category: 'ads' },
      ],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/edro/templates',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it('POST creates a template', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'new-t' }] });

    const res = await app.inject({
      method: 'POST',
      url: '/api/edro/templates',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'Weekly', category: 'social', channels: ['instagram'] },
    });

    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });
});
