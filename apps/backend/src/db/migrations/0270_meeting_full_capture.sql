-- Full Recall capture: audio recording flag + chat messages table

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS has_audio_recording BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN meetings.has_audio_recording IS 'true when a separate audio_mixed track is available from the bot provider';

-- Chat messages captured from meeting platforms via Recall bot
CREATE TABLE IF NOT EXISTS meeting_chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  tenant_id    TEXT NOT NULL,
  client_id    TEXT NOT NULL,
  sender_name  TEXT,
  sender_email TEXT,
  is_host      BOOLEAN NOT NULL DEFAULT false,
  message_text TEXT NOT NULL,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_chat_meeting ON meeting_chat_messages(meeting_id, sent_at);
