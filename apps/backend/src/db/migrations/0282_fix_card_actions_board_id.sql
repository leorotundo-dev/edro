-- project_card_actions was created in some envs before board_id was added to the schema.
-- This migration safely backfills the column and its index if missing.
ALTER TABLE project_card_actions
  ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES project_boards(id) ON DELETE CASCADE;

-- Backfill board_id from project_cards for existing rows that may have NULL
UPDATE project_card_actions pca
SET board_id = pc.board_id
FROM project_cards pc
WHERE pca.card_id = pc.id
  AND pca.board_id IS NULL;

CREATE INDEX IF NOT EXISTS project_card_actions_board_idx
  ON project_card_actions(board_id, occurred_at DESC);
