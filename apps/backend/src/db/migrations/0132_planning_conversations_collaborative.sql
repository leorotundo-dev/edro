-- Allow 'collaborative' provider in planning_conversations
ALTER TABLE planning_conversations DROP CONSTRAINT IF EXISTS planning_conversations_provider_check;
ALTER TABLE planning_conversations ADD CONSTRAINT planning_conversations_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'google', 'collaborative'));
