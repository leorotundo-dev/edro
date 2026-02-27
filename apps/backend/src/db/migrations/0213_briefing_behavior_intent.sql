-- Migration 0213: Link edro_briefings to behavioral intent for LearningEngine loop
-- Closes the Campaign → BehaviorIntent → Briefing → Performance feedback arc.

ALTER TABLE edro_briefings
  ADD COLUMN IF NOT EXISTS behavior_intent_id TEXT;

COMMENT ON COLUMN edro_briefings.behavior_intent_id IS
  'ID of the behavior_intent (from campaigns.behavior_intents[]) that originated this briefing.
   Used by LearningEngine to correlate copy performance with AMD/trigger hypotheses.';

CREATE INDEX IF NOT EXISTS edro_briefings_behavior_intent_idx
  ON edro_briefings (behavior_intent_id)
  WHERE behavior_intent_id IS NOT NULL;
