-- Migration 0021: Etapas de processamento dos editais
-- Armazena o status de cada etapa para exibicao no frontend

ALTER TABLE editais
  ADD COLUMN IF NOT EXISTS processing_steps JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN editais.processing_steps IS 'Etapas do processamento do edital com timestamps';

UPDATE editais
SET processing_steps = jsonb_strip_nulls(
  jsonb_build_object(
    'coletado_at', created_at,
    'edital_encontrado_at',
      CASE
        WHEN link_edital_completo IS NOT NULL
          OR jsonb_array_length(COALESCE(arquivos, '[]'::jsonb)) > 0
        THEN updated_at
        ELSE NULL
      END,
    'edital_processado_at',
      CASE
        WHEN descricao IS NOT NULL
          OR data_publicacao IS NOT NULL
          OR data_prova_prevista IS NOT NULL
          OR numero_vagas > 0
          OR taxa_inscricao IS NOT NULL
        THEN updated_at
        ELSE NULL
      END,
    'materias_encontradas_at',
      CASE
        WHEN jsonb_array_length(COALESCE(disciplinas, '[]'::jsonb)) > 0
        THEN updated_at
        ELSE NULL
      END,
    'materias_processadas_at',
      CASE
        WHEN COALESCE(conteudo_programatico, '{}'::jsonb) <> '{}'::jsonb
        THEN updated_at
        ELSE NULL
      END,
    'cronograma_processado_at',
      (
        SELECT MAX(created_at)
        FROM edital_eventos ee
        WHERE ee.edital_id = editais.id
      )
  )
)
WHERE processing_steps IS NULL
   OR processing_steps = '{}'::jsonb;
