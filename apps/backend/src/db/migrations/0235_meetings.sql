-- Meeting recordings and extracted actions for Jarvis meeting bot
CREATE TABLE IF NOT EXISTS meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  platform        TEXT,                          -- google_meet | zoom | teams | upload
  meeting_url     TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_secs   INT,
  transcript      TEXT,                          -- full Whisper transcript
  summary         TEXT,                          -- AI-generated summary
  status          TEXT NOT NULL DEFAULT 'processing', -- processing | analyzed | approved | archived
  audio_key       TEXT,                          -- storage key for raw audio
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  tenant_id       TEXT NOT NULL,
  client_id       TEXT NOT NULL,
  type            TEXT NOT NULL,                 -- briefing | task | campaign | pauta | note
  title           TEXT NOT NULL,
  description     TEXT,
  responsible     TEXT,                          -- person mentioned in transcript
  deadline        DATE,
  priority        TEXT DEFAULT 'medium',         -- high | medium | low
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | done
  system_item_id  UUID,                          -- created briefing/campaign/pauta ID after approval
  raw_excerpt     TEXT,                          -- transcript excerpt that originated this action
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_client ON meetings(client_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_actions_meeting ON meeting_actions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_actions_client ON meeting_actions(client_id, status);
