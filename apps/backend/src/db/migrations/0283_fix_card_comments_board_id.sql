-- project_card_comments was created in 0279 before board_id was part of the schema.
-- Add board_id, backfill from project_cards, and index for trelloHistoryAnalyzer queries.
ALTER TABLE project_card_comments
  ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES project_boards(id) ON DELETE CASCADE;

UPDATE project_card_comments pcc
SET board_id = pc.board_id
FROM project_cards pc
WHERE pcc.card_id = pc.id
  AND pcc.board_id IS NULL;

CREATE INDEX IF NOT EXISTS project_card_comments_board_idx
  ON project_card_comments(board_id, commented_at DESC);
