import { db } from '../db';
import type {
  Edital,
  EditalEvento,
  EditalQuestao,
  EditalUsuario,
  EditalStats,
  CreateEditalDTO,
  UpdateEditalDTO,
  CreateEventoDTO,
  EditalFilters,
} from '../types/edital';

export class EditalRepository {
  // =============== EDITAIS ===============

  async findAll(filters?: EditalFilters) {
    let query = 'SELECT * FROM editais WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        paramCount++;
        query += ` AND status = ANY($${paramCount})`;
        params.push(filters.status);
      } else {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
      }
    }

    if (filters?.banca) {
      paramCount++;
      query += ` AND banca ILIKE $${paramCount}`;
      params.push(`%${filters.banca}%`);
    }

    if (filters?.orgao) {
      paramCount++;
      query += ` AND orgao ILIKE $${paramCount}`;
      params.push(`%${filters.orgao}%`);
    }

    if (filters?.search) {
      paramCount++;
      query += ` AND (titulo ILIKE $${paramCount} OR codigo ILIKE $${paramCount} OR orgao ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    if (filters?.data_prova_inicio) {
      paramCount++;
      query += ` AND data_prova_prevista >= $${paramCount}`;
      params.push(filters.data_prova_inicio);
    }

    if (filters?.data_prova_fim) {
      paramCount++;
      query += ` AND data_prova_prevista <= $${paramCount}`;
      params.push(filters.data_prova_fim);
    }

    if (filters?.tags && filters.tags.length > 0) {
      paramCount++;
      query += ` AND tags ?| $${paramCount}`;
      params.push(filters.tags);
    }

    // Ordenação
    const sortBy = filters?.sort_by || 'created_at';
    const sortOrder = filters?.sort_order || 'desc';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Paginação
    const limit = filters?.limit || 50;
    const page = filters?.page || 1;
    const offset = (page - 1) * limit;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await db.query<Edital>(query, params);
    return result.rows;
  }

  async findById(id: string) {
    const result = await db.query<Edital>(
      `SELECT * FROM editais
       WHERE id::text = $1
         OR codigo = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByCodigo(codigo: string) {
    const result = await db.query<Edital>(
      'SELECT * FROM editais WHERE codigo = $1',
      [codigo]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateEditalDTO, userId?: string) {
    const {
      codigo,
      titulo,
      orgao,
      banca,
      status = 'rascunho',
      data_publicacao,
      data_inscricao_inicio,
      data_inscricao_fim,
      data_prova_prevista,
      descricao,
      cargos = [],
      disciplinas = [],
      conteudo_programatico = {},
      link_edital_completo,
      link_inscricao,
      processing_steps = {},
      numero_vagas = 0,
      numero_inscritos = 0,
      taxa_inscricao,
      tags = [],
      observacoes,
    } = data;

    const result = await db.query<Edital>(
      `INSERT INTO editais (
        codigo, titulo, orgao, banca, status,
        data_publicacao, data_inscricao_inicio, data_inscricao_fim, data_prova_prevista,
        descricao, cargos, disciplinas, conteudo_programatico,
        link_edital_completo, link_inscricao, processing_steps,
        numero_vagas, numero_inscritos, taxa_inscricao,
        tags, observacoes, criado_por, arquivos
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19,
        $20, $21, $22, $23
      ) RETURNING *`,
      [
        codigo,
        titulo,
        orgao,
        banca,
        status,
        data_publicacao,
        data_inscricao_inicio,
        data_inscricao_fim,
        data_prova_prevista,
        descricao,
        JSON.stringify(cargos),
        JSON.stringify(disciplinas),
        JSON.stringify(conteudo_programatico),
        link_edital_completo,
        link_inscricao,
        JSON.stringify(processing_steps),
        numero_vagas,
        numero_inscritos,
        taxa_inscricao,
        JSON.stringify(tags),
        observacoes,
        userId,
        JSON.stringify([]),
      ]
    );

    return result.rows[0];
  }

  async update(data: UpdateEditalDTO, userId?: string) {
    const { id, ...updates } = data;

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        if (['cargos', 'disciplinas', 'conteudo_programatico', 'tags', 'arquivos', 'processing_steps'].includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
      }
    });

    if (userId) {
      paramCount++;
      fields.push(`atualizado_por = $${paramCount}`);
      values.push(userId);
    }

    paramCount++;
    values.push(id);

    const result = await db.query<Edital>(
      `UPDATE editais SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async delete(id: string) {
    const result = await db.query(
      'DELETE FROM editais WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rowCount > 0;
  }

  async getStats() {
    const result = await db.query<EditalStats>('SELECT * FROM editais_stats');
    return result.rows;
  }

  async getStatById(id: string) {
    const result = await db.query<EditalStats>(
      'SELECT * FROM editais_stats WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  // =============== EVENTOS ===============

  async findEventosByEditalId(editalId: string) {
    const result = await db.query<EditalEvento>(
      'SELECT * FROM edital_eventos WHERE edital_id = $1 ORDER BY data_inicio ASC',
      [editalId]
    );
    return result.rows;
  }

  async createEvento(data: CreateEventoDTO) {
    const {
      edital_id,
      tipo,
      titulo,
      descricao,
      data_inicio,
      data_fim,
      link_externo,
      concluido = false,
    } = data;

    const result = await db.query<EditalEvento>(
      `INSERT INTO edital_eventos (
        edital_id, tipo, titulo, descricao, data_inicio, data_fim, link_externo, concluido
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [edital_id, tipo, titulo, descricao, data_inicio, data_fim, link_externo, concluido]
    );

    return result.rows[0];
  }

  async updateEvento(id: string, updates: Partial<CreateEventoDTO>) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'edital_id') {
        paramCount++;
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    });

    paramCount++;
    values.push(id);

    const result = await db.query<EditalEvento>(
      `UPDATE edital_eventos SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async deleteEvento(id: string) {
    const result = await db.query(
      'DELETE FROM edital_eventos WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rowCount > 0;
  }

  // =============== USUÁRIOS INTERESSADOS ===============

  async findUsuariosByEditalId(editalId: string) {
    const result = await db.query<EditalUsuario>(
      'SELECT * FROM edital_usuarios WHERE edital_id = $1',
      [editalId]
    );
    return result.rows;
  }

  async findEditaisByUserId(userId: string) {
    const result = await db.query<Edital>(
      `SELECT e.* FROM editais e
       INNER JOIN edital_usuarios eu ON e.id = eu.edital_id
       WHERE eu.user_id = $1`,
      [userId]
    );
    return result.rows;
  }

  async findInteressesByUserId(userId: string) {
    const result = await db.query<
      Edital & { cargo_interesse?: string | null; notificacoes_ativas?: boolean; interesse_em?: string }
    >(
      `SELECT e.*, eu.cargo_interesse, eu.notificacoes_ativas, eu.created_at AS interesse_em
       FROM edital_usuarios eu
       INNER JOIN editais e ON e.id = eu.edital_id
       WHERE eu.user_id = $1
       ORDER BY eu.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async addUsuario(editalId: string, userId: string, cargoInteresse?: string) {
    const result = await db.query<EditalUsuario>(
      `INSERT INTO edital_usuarios (edital_id, user_id, cargo_interesse)
       VALUES ($1, $2, $3)
       ON CONFLICT (edital_id, user_id) DO UPDATE
       SET cargo_interesse = $3, updated_at = NOW()
       RETURNING *`,
      [editalId, userId, cargoInteresse]
    );
    return result.rows[0];
  }

  async updateUsuarioInteresse(
    editalId: string,
    userId: string,
    updates: { cargo_interesse?: string | null; notificacoes_ativas?: boolean }
  ) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (updates.cargo_interesse !== undefined) {
      paramCount += 1;
      fields.push(`cargo_interesse = $${paramCount}`);
      values.push(updates.cargo_interesse);
    }

    if (updates.notificacoes_ativas !== undefined) {
      paramCount += 1;
      fields.push(`notificacoes_ativas = $${paramCount}`);
      values.push(updates.notificacoes_ativas);
    }

    if (!fields.length) {
      return null;
    }

    paramCount += 1;
    values.push(editalId);
    paramCount += 1;
    values.push(userId);

    const result = await db.query<EditalUsuario>(
      `UPDATE edital_usuarios
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE edital_id = $${paramCount - 1} AND user_id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async removeUsuario(editalId: string, userId: string) {
    const result = await db.query(
      'DELETE FROM edital_usuarios WHERE edital_id = $1 AND user_id = $2',
      [editalId, userId]
    );
    return result.rowCount > 0;
  }

  async updateNotificacoes(editalId: string, userId: string, ativas: boolean) {
    const result = await db.query<EditalUsuario>(
      `UPDATE edital_usuarios
       SET notificacoes_ativas = $3, updated_at = NOW()
       WHERE edital_id = $1 AND user_id = $2
       RETURNING *`,
      [editalId, userId, ativas]
    );
    return result.rows[0] || null;
  }

  // =============== QUESTÕES ===============

  async findQuestoesByEditalId(editalId: string) {
    const result = await db.query<EditalQuestao>(
      'SELECT * FROM edital_questoes WHERE edital_id = $1',
      [editalId]
    );
    return result.rows;
  }

  async addQuestao(editalId: string, questaoId: string, disciplina: string, topico?: string, peso?: number) {
    const result = await db.query<EditalQuestao>(
      `INSERT INTO edital_questoes (edital_id, questao_id, disciplina, topico, peso)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (edital_id, questao_id) DO UPDATE
       SET disciplina = $3, topico = $4, peso = $5
       RETURNING *`,
      [editalId, questaoId, disciplina, topico, peso || 1.0]
    );
    return result.rows[0];
  }

  async removeQuestao(editalId: string, questaoId: string) {
    const result = await db.query(
      'DELETE FROM edital_questoes WHERE edital_id = $1 AND questao_id = $2',
      [editalId, questaoId]
    );
    return result.rowCount > 0;
  }

  // =============== UTILIDADES ===============

  async countByStatus() {
    const result = await db.query(
      `SELECT status, COUNT(*) as count
       FROM editais
       GROUP BY status`
    );
    return result.rows;
  }

  async countByBanca() {
    const result = await db.query(
      `SELECT banca, COUNT(*) as count
       FROM editais
       WHERE banca IS NOT NULL
       GROUP BY banca
       ORDER BY count DESC`
    );
    return result.rows;
  }

  async getProximasProvas(limit = 10) {
    const result = await db.query<Edital>(
      `SELECT * FROM editais
       WHERE data_prova_prevista >= CURRENT_DATE
       AND status IN ('publicado', 'em_andamento')
       ORDER BY data_prova_prevista ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}

export const editalRepository = new EditalRepository();
