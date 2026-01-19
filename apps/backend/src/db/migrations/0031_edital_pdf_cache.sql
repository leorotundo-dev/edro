-- 0031_edital_pdf_cache.sql
-- Cache de PDFs de edital com classificacao e metadados de OCR

CREATE TABLE IF NOT EXISTS edital_pdf_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edital_id UUID REFERENCES editais(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL UNIQUE,
  content_hash TEXT,
  text_content TEXT,
  classification TEXT,
  ocr_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edital_pdf_cache_edital_id ON edital_pdf_cache(edital_id);
CREATE INDEX IF NOT EXISTS idx_edital_pdf_cache_classification ON edital_pdf_cache(classification);
CREATE INDEX IF NOT EXISTS idx_edital_pdf_cache_updated_at ON edital_pdf_cache(updated_at DESC);

CREATE OR REPLACE FUNCTION update_edital_pdf_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_edital_pdf_cache ON edital_pdf_cache;
CREATE TRIGGER trigger_update_edital_pdf_cache
  BEFORE UPDATE ON edital_pdf_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_edital_pdf_cache_updated_at();
