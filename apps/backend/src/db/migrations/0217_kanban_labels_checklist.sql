-- Kanban Trello features: labels + checklist on briefings, labels on campaigns
ALTER TABLE edro_briefings
  ADD COLUMN IF NOT EXISTS labels JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]';

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS labels JSONB NOT NULL DEFAULT '[]';
