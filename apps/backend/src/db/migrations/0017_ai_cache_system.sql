-- ==============================================
-- MIGRATION 0017: Sistema de Cache de IA
-- ==============================================
--
-- Adiciona tabela para cache de respostas da IA
-- Usado para fallback quando OpenAI está indisponível
--
-- ==============================================

-- Tabela de cache de IA
CREATE TABLE IF NOT EXISTS ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  cache_type VARCHAR(50) NOT NULL, -- 'embedding', 'completion', 'mnemonic', 'analysis', etc
  input_text TEXT,
  output_data JSONB NOT NULL,
  -- Embedding armazenado como JSONB para compatibilidade (evita extensão pgvector)
  embedding JSONB, -- Estrutura livre para embeddings quando disponível
  hit_count INT DEFAULT 0,
  ttl_hours INT DEFAULT 24,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  CONSTRAINT valid_cache_type CHECK (cache_type IN ('embedding', 'completion', 'mnemonic', 'analysis', 'question', 'drop', 'summary', 'blueprint'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_cache_type ON ai_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_hit_count ON ai_cache(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cache_created ON ai_cache(created_at DESC);

-- Índice parcial para itens sem expiração (usa somente colunas)
CREATE INDEX IF NOT EXISTS idx_ai_cache_active 
  ON ai_cache(cache_type, hit_count DESC) 
  WHERE expires_at IS NULL;

-- Função para limpar cache expirado automaticamente
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_cache
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE ai_cache IS 'Cache de respostas da IA para fallback quando OpenAI está indisponível';
COMMENT ON COLUMN ai_cache.cache_key IS 'Chave única gerada a partir da operação + hash dos parâmetros';
COMMENT ON COLUMN ai_cache.cache_type IS 'Tipo de operação (embedding, completion, etc)';
COMMENT ON COLUMN ai_cache.input_text IS 'Texto de entrada original (para debug e similarity)';
COMMENT ON COLUMN ai_cache.output_data IS 'Resposta da IA em formato JSON';
COMMENT ON COLUMN ai_cache.embedding IS 'Vetor de embedding (quando aplicável) para similarity search';
COMMENT ON COLUMN ai_cache.hit_count IS 'Número de vezes que este cache foi usado (popularity)';
COMMENT ON COLUMN ai_cache.ttl_hours IS 'Time-to-live em horas (usado para calcular expires_at)';
COMMENT ON COLUMN ai_cache.expires_at IS 'Data/hora de expiração do cache';

-- ==============================================
-- DADOS INICIAIS: Respostas pré-computadas
-- ==============================================

-- Inserir algumas respostas pré-computadas para fallback garantido
INSERT INTO ai_cache (cache_key, cache_type, input_text, output_data, ttl_hours, expires_at) VALUES
  -- Fallback para mnemônicos
  ('precomputed:mnemonic', 'mnemonic', '', '{"texto": "Sistema temporariamente indisponível. Por favor, tente novamente em alguns instantes.", "explicacao": "A geração de mnemônicos está temporariamente offline."}', NULL, NULL),
  
  -- Fallback para análise de questões
  ('precomputed:analysis', 'analysis', '', '{"difficulty": 3, "topics": ["Conhecimentos Gerais"], "explanation": "Análise temporariamente indisponível. A questão será analisada em breve.", "bancaStyle": "N/A"}', NULL, NULL),
  
  -- Fallback para geração de drops
  ('precomputed:drop', 'drop', '', '{"title": "Conteúdo Temporariamente Indisponível", "content": "Estamos processando seu conteúdo. Por favor, tente novamente em alguns minutos.", "examples": [], "tips": ["Tente novamente em breve", "O sistema estará disponível em instantes"]}', NULL, NULL),
  
  -- Fallback para geração de questões
  ('precomputed:question', 'question', '', '{"statement": "Geração de questões temporariamente indisponível.", "options": ["Aguarde alguns instantes", "Tente novamente", "Sistema em manutenção", "Voltamos logo", "Obrigado pela paciência"], "correctAnswer": "a", "explanation": "Sistema temporariamente offline."}', NULL, NULL)
ON CONFLICT (cache_key) DO NOTHING;

-- ==============================================
-- ESTATÍSTICAS
-- ==============================================

-- View para estatísticas de cache
CREATE OR REPLACE VIEW ai_cache_stats AS
SELECT 
  cache_type,
  COUNT(*) as total_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits,
  MAX(hit_count) as max_hits,
  COUNT(*) FILTER (WHERE expires_at IS NULL) as active_entries,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW()) as expired_entries,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM ai_cache
GROUP BY cache_type;

COMMENT ON VIEW ai_cache_stats IS 'Estatísticas de uso do cache de IA por tipo';

-- ==============================================
-- FIM DA MIGRATION
-- ==============================================
