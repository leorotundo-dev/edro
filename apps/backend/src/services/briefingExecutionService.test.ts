import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockGetBriefingById } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockGetBriefingById: vi.fn(),
}));

vi.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

vi.mock('../repositories/edroBriefingRepository', () => ({
  getBriefingById: (...args: any[]) => mockGetBriefingById(...args),
}));

import {
  buildBriefingExecutionSnapshot,
  inferBriefingRequiresCopy,
  isFreelancerVisibleBriefingStatus,
} from './briefingExecutionService';

describe('briefingExecutionService', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetBriefingById.mockReset();
  });

  it('keeps visual-only briefings ready without approved copy when visual instructions are complete', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const snapshot = await buildBriefingExecutionSnapshot({
      id: 'briefing-visual',
      payload: {
        requires_copy: false,
        objective: 'Criar desdobramento visual de campanha existente',
        format: 'Resize story 1080x1920',
        platform: 'instagram',
        visual_instructions: ['Manter KV aprovado', 'Ajustar hierarquia do CTA'],
        mandatory_elements: ['Logo da campanha'],
      },
      copy_approved_at: null,
      copy_approval_comment: null,
    });

    expect(snapshot.requires_copy).toBe(false);
    expect(snapshot.job_mode).toBe('visual_only');
    expect(snapshot.execution_ready).toBe(true);
    expect(snapshot.approved_copy).toBeNull();
    expect(snapshot.blocking_reasons).toEqual([]);
  });

  it('requires approved copy for copy-ready briefings before execution', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const snapshot = await buildBriefingExecutionSnapshot({
      id: 'briefing-copy-missing',
      payload: {
        requires_copy: true,
        objective: 'Criar post para campanha de performance',
        format: 'Carrossel Instagram',
        platform: 'instagram',
        visual_instructions: ['Usar KV aprovado'],
      },
      copy_approved_at: null,
      copy_approval_comment: null,
    });

    expect(snapshot.requires_copy).toBe(true);
    expect(snapshot.job_mode).toBe('copy_ready');
    expect(snapshot.execution_ready).toBe(false);
    expect(snapshot.blocking_reasons).toContain('A copy aprovada ainda não está disponível para execução.');
  });

  it('becomes execution-ready when an approved copy version exists', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          output: 'Headline aprovada\n\nCorpo final\n\nCTA final',
          status: 'selected',
          draft_approved_at: '2026-03-24T12:00:00.000Z',
          created_at: '2026-03-24T11:00:00.000Z',
        },
      ],
    });

    const snapshot = await buildBriefingExecutionSnapshot({
      id: 'briefing-copy-ready',
      payload: {
        requires_copy: true,
        objective: 'Criar peça com copy fechada',
        format: 'Post feed',
        platform: 'instagram',
        visual_instructions: ['Respeitar o grid institucional'],
        definition_of_done: ['Subir link final do Figma', 'Exportar PNG'],
      },
      copy_approved_at: '2026-03-24T12:00:00.000Z',
      copy_approval_comment: 'Usar a versão final aprovada pelo time interno',
    });

    expect(snapshot.execution_ready).toBe(true);
    expect(snapshot.approved_copy).toEqual({
      text: 'Headline aprovada\n\nCorpo final\n\nCTA final',
      source: 'copy_version',
      approved_at: '2026-03-24T12:00:00.000Z',
      comment: 'Usar a versão final aprovada pelo time interno',
    });
    expect(snapshot.definition_of_done).toEqual(['Subir link final do Figma', 'Exportar PNG']);
  });

  it('infers copy requirement and freelancer-visible statuses from the operational contract', () => {
    expect(inferBriefingRequiresCopy({ format: 'Carrossel Instagram' })).toBe(true);
    expect(inferBriefingRequiresCopy({ format: 'Resize visual', requires_copy: false })).toBe(false);

    expect(isFreelancerVisibleBriefingStatus('producao')).toBe(true);
    expect(isFreelancerVisibleBriefingStatus('ajustes')).toBe(true);
    expect(isFreelancerVisibleBriefingStatus('briefing')).toBe(false);
    expect(isFreelancerVisibleBriefingStatus('copy_ia')).toBe(false);
  });
});
