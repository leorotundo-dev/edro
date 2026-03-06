-- Add review_token to briefing_approvals for approval email links
ALTER TABLE briefing_approvals
  ADD COLUMN IF NOT EXISTS review_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS copy_text    TEXT,
  ADD COLUMN IF NOT EXISTS image_url    TEXT;
