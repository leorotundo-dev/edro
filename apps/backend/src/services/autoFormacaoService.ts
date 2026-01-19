import crypto from 'crypto';
import { query } from '../db';
import { editalRepository } from '../repositories/editalRepository';
import type { Edital, EditalDisciplina } from '../types/edital';

export interface AutoFormacaoRow {
  id: string;
  edital_id: string;
  user_id: string;
  version: number;
  source_hash: string;
  status: string;
  payload: any;
  created_at: string;
  updated_at: string;
}

export interface AutoFormacaoPayload {
  edital_id: string;
  user_id: string;
  version: number;
  generated_at: string;
  banca?: string;
  modulos: Array<{
    id: string;
    nome: string;
    trilhas: string[];
    cargos?: string[];
  }>;
  trilhas: Array<{
    id: string;
    nome: string;
    disciplina: string;
    nivel: number;
    drops: string[];
    carga_sugerida_horas: number;
    drops_sugeridos: number;
  }>;
  blocos: Array<{
    id: string;
    nome: string;
    disciplina: string;
    nivel: number;
    drops: string[];
  }>;
  drops: Array<{
    id: string;
    disciplina: string;
    subtopico: string;
    nivel: number;
    prioridade: number;
    origem: string;
  }>;
  resumo: Record<string, any>;
  signals: Record<string, any>;
}

type ErrorStats = { wrong: number; total: number };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function hashId(prefix: string, value: string): string {
  const digest = crypto.createHash('sha1').update(value).digest('hex').slice(0, 12);
  return `${prefix}_${digest}`;
}

function normalizeName(value?: string): string {
  return (value || '').trim();
}

function uniqueList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  });
  return result;
}

function flattenProgramContent(node: any): string[] {
  if (!node) return [];
  if (Array.isArray(node)) {
    return node.flatMap(flattenProgramContent);
  }
  if (typeof node === 'string') {
    return [node];
  }
  if (typeof node === 'object') {
    if (Array.isArray(node.topicos)) {
      return node.topicos.flatMap(flattenProgramContent);
    }
    if (Array.isArray(node.subtopicos)) {
      return node.subtopicos.flatMap(flattenProgramContent);
    }
    return Object.entries(node).flatMap(([key, value]) => {
      const nested = flattenProgramContent(value);
      return nested.length ? nested : [key];
    });
  }
  return [];
}

function extractDisciplineSubtopics(
  disciplina: EditalDisciplina,
  conteudoProgramatico: Record<string, any>
): string[] {
  const results: string[] = [];
  const discName = normalizeName(disciplina?.nome);

  if (Array.isArray(disciplina?.topicos)) {
    disciplina.topicos.forEach((topico) => {
      if (typeof topico === 'string') {
        results.push(topico);
      } else if (topico && typeof topico === 'object') {
        if (topico.nome) results.push(String(topico.nome));
        if (Array.isArray((topico as any).subtopicos)) {
          results.push(...(topico as any).subtopicos.map((item: any) => String(item)));
        }
      }
    });
  }

  const keys = Object.keys(conteudoProgramatico || {});
  const matchedKey = keys.find((key) => key.toLowerCase() === discName.toLowerCase());
  const discContent = matchedKey ? conteudoProgramatico[matchedKey] : conteudoProgramatico?.[discName];
  if (discContent) {
    results.push(...flattenProgramContent(discContent));
  }

  return uniqueList(results);
}

function computeDisciplineWeight(disciplina: EditalDisciplina): number {
  if (typeof disciplina?.peso === 'number' && disciplina.peso > 0) return disciplina.peso;
  if (typeof disciplina?.numero_questoes === 'number' && disciplina.numero_questoes > 0) {
    return Math.min(10, Math.max(1, Math.round(disciplina.numero_questoes / 4)));
  }
  return 5;
}

function resolveNivel(priority: number): number {
  if (priority >= 0.8) return 5;
  if (priority >= 0.6) return 4;
  if (priority >= 0.4) return 3;
  if (priority >= 0.2) return 2;
  return 1;
}

async function loadErrorStats(userId: string): Promise<Map<string, ErrorStats>> {
  const map = new Map<string, ErrorStats>();
  if (!userId) return map;

  const { rows } = await query<{
    subtopico: string | null;
    wrong: number | string | null;
    total: number | string | null;
  }>(`
    SELECT
      COALESCE(q.subtopico, q.topic) AS subtopico,
      SUM(CASE WHEN sq.is_correct = false THEN 1 ELSE 0 END) AS wrong,
      COUNT(*) AS total
    FROM simulados_questoes sq
    JOIN simulados_execucao se ON se.id = sq.execution_id
    JOIN questoes q ON q.id = sq.question_id
    WHERE se.user_id = $1
      AND (q.subtopico IS NOT NULL OR q.topic IS NOT NULL)
    GROUP BY 1
  `, [userId]);

  rows.forEach((row) => {
    if (!row.subtopico) return;
    const key = row.subtopico.toLowerCase();
    const wrong = Number(row.wrong || 0);
    const total = Number(row.total || 0);
    map.set(key, { wrong, total });
  });

  const { rows: errorRows } = await query<{
    subtopico: string | null;
    wrong: number | string | null;
  }>(`
    SELECT
      COALESCE(q.subtopico, q.topic) AS subtopico,
      COUNT(*) AS wrong
    FROM questoes_erro_map qm
    JOIN questoes q ON q.id = qm.questao_id
    WHERE qm.user_id = $1
      AND (q.subtopico IS NOT NULL OR q.topic IS NOT NULL)
    GROUP BY 1
  `, [userId]);

  errorRows.forEach((row) => {
    if (!row.subtopico) return;
    const key = row.subtopico.toLowerCase();
    const wrong = Number(row.wrong || 0);
    const existing = map.get(key);
    if (existing) {
      existing.wrong += wrong;
      if (!existing.total) existing.total = existing.wrong;
    } else {
      map.set(key, { wrong, total: wrong });
    }
  });

  return map;
}

async function resolveLatestSimuladoAt(userId: string): Promise<string | null> {
  const { rows } = await query<{ last_at: string | null }>(
    `SELECT MAX(finished_at) AS last_at FROM simulados_resultados WHERE user_id = $1`,
    [userId]
  );
  const value: any = rows[0]?.last_at;
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function buildSourceHash(edital: Edital, userId: string): Promise<{ hash: string; lastSimuladoAt: string | null }> {
  const lastSimuladoAt = await resolveLatestSimuladoAt(userId);
  const editalUpdatedAt: any = edital.updated_at || edital.created_at;
  const editalStamp = editalUpdatedAt instanceof Date ? editalUpdatedAt.toISOString() : String(editalUpdatedAt || '');
  const disciplinas = Array.isArray(edital.disciplinas) ? edital.disciplinas : [];
  const conteudo = edital.conteudo_programatico && typeof edital.conteudo_programatico === 'object'
    ? edital.conteudo_programatico
    : {};
  const base = [
    edital.id,
    editalStamp,
    edital.data_prova_prevista || '',
    String(disciplinas.length),
    String(Object.keys(conteudo).length),
    lastSimuladoAt || 'none',
  ].join('|');
  const hash = crypto.createHash('sha256').update(base).digest('hex');
  return { hash, lastSimuladoAt };
}

async function buildAutoFormacaoPayload(
  edital: Edital,
  userId: string,
  version: number,
  sourceHash: string,
  lastSimuladoAt: string | null
): Promise<AutoFormacaoPayload> {
  const editalUpdatedAtValue: any = edital.updated_at || edital.created_at;
  const editalUpdatedAt = editalUpdatedAtValue instanceof Date
    ? editalUpdatedAtValue.toISOString()
    : String(editalUpdatedAtValue || '');
  const disciplinas = Array.isArray(edital.disciplinas) ? edital.disciplinas : [];
  const conteudoProgramatico =
    edital.conteudo_programatico && typeof edital.conteudo_programatico === 'object'
      ? edital.conteudo_programatico
      : {};
  if (!disciplinas.length && Object.keys(conteudoProgramatico).length) {
    Object.keys(conteudoProgramatico).forEach((nome) => {
      disciplinas.push({ nome } as EditalDisciplina);
    });
  }
  const cargos = Array.isArray(edital.cargos) ? edital.cargos : [];
  const errorMap = await loadErrorStats(userId);

  const drops: AutoFormacaoPayload['drops'] = [];
  const trilhas: AutoFormacaoPayload['trilhas'] = [];
  const blocos: AutoFormacaoPayload['blocos'] = [];

  let totalErrors = 0;
  let totalQuestions = 0;

  disciplinas.forEach((disciplina) => {
    const discName = normalizeName(disciplina?.nome) || 'Disciplina';
    const weight = computeDisciplineWeight(disciplina);
    let subtopics = extractDisciplineSubtopics(disciplina, conteudoProgramatico);
    if (!subtopics.length) {
      subtopics = ['Fundamentos'];
    }

    const dropEntries = subtopics.map((subtopico) => {
      const key = subtopico.toLowerCase();
      const stats = errorMap.get(key);
      const wrong = stats?.wrong || 0;
      const total = stats?.total || 0;
      const errorRate = total > 0 ? wrong / total : (wrong > 0 ? 1 : 0);
      totalErrors += wrong;
      totalQuestions += total;

      const weightScore = clamp01(weight / 10);
      const priority = clamp01(weightScore * 0.4 + errorRate * 0.6);
      const nivel = resolveNivel(priority);
      const dropId = hashId('drop', `${edital.id}|${discName}|${subtopico}|${nivel}`);

      return {
        id: dropId,
        disciplina: discName,
        subtopico,
        nivel,
        prioridade: Math.round(priority * 100) / 100,
        origem: 'auto_formacao',
      };
    });

    dropEntries.sort((a, b) => b.prioridade - a.prioridade);
    drops.push(...dropEntries);

    for (let nivel = 1; nivel <= 5; nivel++) {
      const levelDrops = dropEntries.filter((drop) => drop.nivel === nivel);
      if (!levelDrops.length) continue;

      const trilhaId = hashId('trilha', `${edital.id}|${discName}|${nivel}`);
      const blocoId = hashId('bloco', `${edital.id}|${discName}|${nivel}`);
      const dropIds = levelDrops.map((drop) => drop.id);
      const carga = Math.max(1, Math.round(dropIds.length * 0.6 + weight));

      trilhas.push({
        id: trilhaId,
        nome: `${discName} - N${nivel}`,
        disciplina: discName,
        nivel,
        drops: dropIds,
        carga_sugerida_horas: carga,
        drops_sugeridos: dropIds.length,
      });

      blocos.push({
        id: blocoId,
        nome: `${discName} - Bloco N${nivel}`,
        disciplina: discName,
        nivel,
        drops: dropIds,
      });
    }
  });

  const trilhaIds = trilhas.map((trilha) => trilha.id);
  const modulos: AutoFormacaoPayload['modulos'] = [];

  if (cargos.length) {
    cargos.forEach((cargo, idx) => {
      const name = normalizeName((cargo as any)?.nome) || `Cargo ${idx + 1}`;
      modulos.push({
        id: hashId('modulo', `${edital.id}|${name}`),
        nome: name,
        trilhas: trilhaIds,
        cargos: [name],
      });
    });
  } else {
    modulos.push({
      id: hashId('modulo', `${edital.id}|base`),
      nome: 'Base',
      trilhas: trilhaIds,
    });
  }

  const resumo = {
    total_disciplinas: disciplinas.length,
    total_trilhas: trilhas.length,
    total_blocos: blocos.length,
    total_drops: drops.length,
    total_subtopicos: drops.length,
    personalizacao: {
      total_erros: totalErrors,
      total_questoes: totalQuestions,
      fonte: totalQuestions > 0 ? 'simulados' : (totalErrors > 0 ? 'erro_map' : 'sem_dados'),
    },
  };

  const signals = {
    source_hash: sourceHash,
    edital_updated_at: editalUpdatedAt,
    last_simulado_at: lastSimuladoAt,
  };

  return {
    edital_id: edital.id,
    user_id: userId,
    version,
    generated_at: new Date().toISOString(),
    banca: edital.banca,
    modulos,
    trilhas,
    blocos,
    drops,
    resumo,
    signals,
  };
}

export async function getAutoFormacao(editalId: string, userId: string): Promise<AutoFormacaoRow | null> {
  const { rows } = await query<AutoFormacaoRow>(
    `SELECT * FROM edital_auto_formacoes WHERE edital_id = $1 AND user_id = $2 LIMIT 1`,
    [editalId, userId]
  );
  return rows[0] || null;
}

export async function generateAutoFormacao(params: {
  editalId: string;
  userId: string;
  force?: boolean;
}): Promise<AutoFormacaoRow> {
  const edital = await editalRepository.findById(params.editalId);
  if (!edital) {
    throw new Error('edital_not_found');
  }

  const existing = await getAutoFormacao(params.editalId, params.userId);
  const { hash: sourceHash, lastSimuladoAt } = await buildSourceHash(edital, params.userId);

  if (existing && existing.source_hash === sourceHash && !params.force) {
    return existing;
  }

  const nextVersion = existing ? existing.version + 1 : 1;
  const payload = await buildAutoFormacaoPayload(edital, params.userId, nextVersion, sourceHash, lastSimuladoAt);

  const { rows } = await query<AutoFormacaoRow>(
    `
      INSERT INTO edital_auto_formacoes (
        edital_id,
        user_id,
        version,
        source_hash,
        status,
        payload
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (edital_id, user_id) DO UPDATE SET
        version = EXCLUDED.version,
        source_hash = EXCLUDED.source_hash,
        status = EXCLUDED.status,
        payload = EXCLUDED.payload,
        updated_at = NOW()
      RETURNING *
    `,
    [
      params.editalId,
      params.userId,
      nextVersion,
      sourceHash,
      'active',
      JSON.stringify(payload),
    ]
  );

  const saved = rows[0];

  await query(
    `
      INSERT INTO edital_auto_formacoes_versions (
        auto_formacao_id,
        version,
        source_hash,
        payload
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `,
    [saved.id, nextVersion, sourceHash, JSON.stringify(payload)]
  );

  return saved;
}

export default {
  getAutoFormacao,
  generateAutoFormacao,
};
