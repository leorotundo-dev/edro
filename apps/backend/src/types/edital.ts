// Tipos para o sistema de Editais

export type EditalStatus = 
  | 'rascunho' 
  | 'publicado' 
  | 'em_andamento' 
  | 'suspenso' 
  | 'cancelado' 
  | 'concluido';

export type EventoTipo = 
  | 'inscricao' 
  | 'prova' 
  | 'resultado' 
  | 'recurso' 
  | 'convocacao' 
  | 'outro';

export interface EditalCargo {
  nome: string;
  vagas: number;
  vagas_ac?: number;
  vagas_pcd?: number;
  salario?: number;
  requisitos?: string;
  carga_horaria?: string;
  descricao?: string;
}

export interface EditalDisciplina {
  nome: string;
  peso?: number;
  numero_questoes?: number;
  topicos?: string[];
}

export interface EditalArquivo {
  nome: string;
  url: string;
  tipo: string;
  tamanho?: number;
  data_upload: string;
  origem_url?: string;
}

export interface EditalProcessingSteps {
  coletado_at?: string | null;
  edital_encontrado_at?: string | null;
  edital_processado_at?: string | null;
  ocr_processado_at?: string | null;
  ocr_status?: string | null;
  ocr_method?: string | null;
  ocr_words?: number | null;
  ocr_used?: boolean | null;
  materias_encontradas_at?: string | null;
  materias_processadas_at?: string | null;
  cronograma_processado_at?: string | null;
  last_error?: string | null;
}

export interface Edital {
  id: string;
  codigo: string;
  titulo: string;
  orgao: string;
  banca?: string;
  
  status: EditalStatus;
  data_publicacao?: string;
  data_inscricao_inicio?: string;
  data_inscricao_fim?: string;
  data_prova_prevista?: string;
  data_prova_realizada?: string;
  
  descricao?: string;
  cargos: EditalCargo[];
  disciplinas: EditalDisciplina[];
  conteudo_programatico?: Record<string, any>;
  
  link_edital_completo?: string;
  link_inscricao?: string;
  arquivos: EditalArquivo[];
  processing_steps?: EditalProcessingSteps;
  
  numero_vagas: number;
  numero_inscritos: number;
  taxa_inscricao?: number;
  
  tags: string[];
  observacoes?: string;
  
  criado_por?: string;
  atualizado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface EditalEvento {
  id: string;
  edital_id: string;
  tipo: EventoTipo;
  titulo: string;
  descricao?: string;
  data_inicio?: string;
  data_fim?: string;
  link_externo?: string;
  concluido: boolean;
  created_at: string;
  updated_at: string;
}

export interface EditalQuestao {
  id: string;
  edital_id: string;
  questao_id: string;
  disciplina: string;
  topico?: string;
  peso: number;
  created_at: string;
}

export interface EditalUsuario {
  id: string;
  edital_id: string;
  user_id: string;
  cargo_interesse?: string;
  notificacoes_ativas: boolean;
  created_at: string;
  updated_at: string;
}

export interface EditalStats {
  id: string;
  codigo: string;
  titulo: string;
  status: EditalStatus;
  banca?: string;
  numero_vagas: number;
  usuarios_interessados: number;
  total_questoes: number;
  data_prova_prevista?: string;
  created_at: string;
}

export interface CreateEditalDTO {
  codigo: string;
  titulo: string;
  orgao: string;
  banca?: string;
  status?: EditalStatus;
  data_publicacao?: string;
  data_inscricao_inicio?: string;
  data_inscricao_fim?: string;
  data_prova_prevista?: string;
  descricao?: string;
  cargos?: EditalCargo[];
  disciplinas?: EditalDisciplina[];
  conteudo_programatico?: Record<string, any>;
  link_edital_completo?: string;
  link_inscricao?: string;
  processing_steps?: EditalProcessingSteps;
  numero_vagas?: number;
  numero_inscritos?: number;
  taxa_inscricao?: number;
  tags?: string[];
  observacoes?: string;
}

export interface UpdateEditalDTO extends Partial<CreateEditalDTO> {
  id: string;
}

export interface CreateEventoDTO {
  edital_id: string;
  tipo: EventoTipo;
  titulo: string;
  descricao?: string;
  data_inicio?: string;
  data_fim?: string;
  link_externo?: string;
  concluido?: boolean;
}

export interface EditalFilters {
  status?: EditalStatus | EditalStatus[];
  banca?: string;
  orgao?: string;
  data_prova_inicio?: string;
  data_prova_fim?: string;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'data_publicacao' | 'data_prova_prevista' | 'created_at' | 'titulo';
  sort_order?: 'asc' | 'desc';
}
