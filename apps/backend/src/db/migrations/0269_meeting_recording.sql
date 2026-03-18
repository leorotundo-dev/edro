-- Meeting video recording availability flag
-- Recall.ai captures video_mixed alongside transcript.
-- We do NOT store the pre-signed URL (it expires); instead we re-fetch on demand.
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS has_recording        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recording_provider   TEXT;    -- 'recall' | 'manual'

COMMENT ON COLUMN meetings.has_recording      IS 'true when a video recording is available from the bot provider';
COMMENT ON COLUMN meetings.recording_provider IS 'provider that holds the recording (recall | manual)';
