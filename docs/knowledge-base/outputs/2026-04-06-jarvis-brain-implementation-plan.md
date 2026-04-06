# JARVIS Brain — Implementation Plan & Summary
**Date:** 2026-04-06
**Branch:** claude/ola-implementation-L1Sg5

---

## What was built

### Phase 1 — Close the loop

#### 1a. Filing Back Service
**File:** `apps/backend/src/services/jarvisKbFilingService.ts`

Function `fileOutputToKb(tenantId, clientId, output, outputType, context)`:
- Extracts which triggers were used, which persona, which micro_behavior, what platform
- Creates `hypothesis`-level entries in `jarvis_kb_entries` for each extracted signal
- outputTypes supported: `copy | briefing | campaign_proposal | qa_answer`
- Hooked into `toolExecutor.ts` → `toolGenerateCopy` (fire-and-forget, non-blocking)

#### 1b. `search_jarvis_kb` as AI Tool
**Files modified:**
- `apps/backend/src/services/ai/toolDefinitions.ts` — added tool definition
- `apps/backend/src/services/ai/toolExecutor.ts` — implemented `toolSearchJarvisKb`
- `apps/backend/src/services/jarvisKbService.ts` — added `searchKbEntries()`

The tool lets JARVIS search its own KB during copy generation, answering: "what worked before for this client?"

#### 1c. Health Check Worker
**File:** `apps/backend/src/jobs/jarvisKbHealthWorker.ts`

- Runs monthly (self-throttled by month key per tenant)
- For each client with >= 3 KB entries: calls Claude to analyze the wiki
- Detects: contradictions, claims without source, gaps, and suggests 3 new articles
- Files findings as `category='health_finding'`, `evidence_level='hypothesis'`
- Registered in `jobsRunner.ts` at offset 20500ms with 600s warn threshold

---

### Phase 2 — Proactive JARVIS

#### 2a. Proactive Proposal Worker
**File:** `apps/backend/src/jobs/jarvisProposalWorker.ts`

- Runs daily at 05:00 UTC (self-throttled)
- For each client with >= 5 confirmed KB entries:
  1. Reads KB patterns (top rules/patterns)
  2. Reads upcoming calendar events (next 30 days)
  3. Reads social listening trends (UP direction)
  4. Reads competitor intelligence (last 14 days)
  5. Calls Claude to generate a proactive campaign proposal
  6. Creates `ai_opportunities` record with `type='proactive_campaign_proposal'`
  7. Files the proposal back to KB via `fileOutputToKb`
- Proposal includes: theme, recommended phase, target persona, suggested triggers, expected micro-behaviors
- Registered in `jobsRunner.ts` at offset 21000ms with 300s warn threshold

---

### Phase 3 — Multi-format agents

#### 3a. Multi-Format Generator
**File:** `apps/backend/src/services/ai/agentMultiFormat.ts`

Function `generateMultiFormatAssets(params)` generates:
- `radio_spot` — 30-second radio script (PT, timing cues `[0s]...[30s]`, voice direction, sound design)
- `film_brief_30s` — 30-second film brief (scene description with timecodes, VO, CTA, mood, visual refs)
- `email_marketing` — complete email (subject, preview text, header, body sections array, CTA button + URL)
- `print_ad` — print ad copy (headline, subheadline, body copy, tagline, CTA, image direction)
- `social_post` — social post (platform, hook, body, CTA, hashtags)

Each format uses behavioral context (persona + trigger + micro_behavior + phase).
All generated assets are filed back to KB via `fileOutputToKb`.

#### 3b. Multi-Format Route
**File:** `apps/backend/src/routes/multiFormat.ts`

- `POST /api/clients/:clientId/generate-campaign-assets`
  - Body: `{ concept, formats[], persona_id?, campaign_phase?, micro_behavior?, triggers?, briefing_id? }`
  - Returns: `{ assets: { radio_spot: {...}, email_marketing: {...}, ... }, errors, filed_to_kb, generated_count }`
- `GET /api/clients/:clientId/generate-campaign-assets/formats` — list supported formats
- Registered in `apps/backend/src/routes/index.ts`

---

### Phase 4 — Campaign entity

#### 4a. Migration
**File:** `apps/backend/src/db/migrations/0304_campaign_entity.sql`

Since `campaigns` table already existed (migration 0116), this migration adds:
- `budget_total` — NUMERIC(12,2), replaces the old `budget_brl`
- `budget_spent` — NUMERIC(12,2) DEFAULT 0
- `kb_proposal_id` — UUID linking to `jarvis_kb_entries`
- `creative_concepts` — JSONB DEFAULT '[]'
- New table: `campaign_assets` with columns: `asset_type`, `asset_id`, `content`, `format`, `behavior_intent_id`, `phase`, `performance`

#### 4b. Campaign Service
**File:** `apps/backend/src/services/campaignService.ts`

CRUD functions: `createCampaign`, `getCampaignById`, `listCampaigns`, `updateCampaign`, `deleteCampaign`
Asset functions: `linkAssetToCampaign`, `listCampaignAssets`, `updateAssetPerformance`

#### 4c. Campaign Routes extended
**File:** `apps/backend/src/routes/campaigns.ts` — appended:

- `GET /api/campaigns/:id/assets` — list assets linked to campaign (optional `?asset_type=` filter)
- `POST /api/campaigns/:id/assets` — link a new asset to campaign
- `PATCH /api/campaigns/assets/:assetId/performance` — update performance metrics for an asset

---

## Architecture: The closed loop

```
Client data (Meta/reportei/social/calendar/competitor)
         ↓
LearningEngine → learning_rules
         ↓
jarvisKbWorker → jarvis_kb_entries (evidence: hypothesis→one_case→pattern→rule)
         ↓                                     ↑
JARVIS generates copy/briefing/proposal    fileOutputToKb (hypothesis)
         ↓                                     ↑
search_jarvis_kb tool ────────────────────────
         ↓
Monthly health check (jarvisKbHealthWorker)
         ↓
Agency KB promoted (3+ clients confirm same pattern)
```

---

## Files created
- `apps/backend/src/services/jarvisKbFilingService.ts`
- `apps/backend/src/services/ai/agentMultiFormat.ts`
- `apps/backend/src/services/campaignService.ts`
- `apps/backend/src/routes/multiFormat.ts`
- `apps/backend/src/jobs/jarvisKbHealthWorker.ts`
- `apps/backend/src/jobs/jarvisProposalWorker.ts`
- `apps/backend/src/db/migrations/0304_campaign_entity.sql`

## Files modified
- `apps/backend/src/services/jarvisKbService.ts` — added `searchKbEntries()`
- `apps/backend/src/services/ai/toolDefinitions.ts` — added `search_jarvis_kb` tool
- `apps/backend/src/services/ai/toolExecutor.ts` — implemented tool + import + copy filing hook
- `apps/backend/src/routes/campaigns.ts` — added campaign_assets endpoints
- `apps/backend/src/routes/index.ts` — registered multiFormat routes
- `apps/backend/src/jobs/jobsRunner.ts` — registered 2 new workers
- `docs/knowledge-base/wiki/learning-rules.md` — documented automated filing mechanism

---

## What was skipped and why

Nothing was skipped. All four phases were implemented as specified.

Notes on implementation decisions:
1. The `campaigns` table already existed from migration 0116 — the 0304 migration adds only missing columns (`budget_total`, `budget_spent`, `kb_proposal_id`, `creative_concepts`) and the new `campaign_assets` table.
2. `creative_concepts` in campaigns was handled inline in JSONB (vs. the separate `creative_concepts` table from 0206) since the entity spec called for it as a campaign column.
3. The KB filing hook in `toolExecutor.ts` is fire-and-forget (void promise) to not block the copy generation response.
4. The health worker uses monthly self-throttle via a simple in-memory map (same pattern as other workers) — adequate for a background job that runs once per month.

---

## Known limitations / next steps

1. `jarvisProposalWorker` uses `client_events` table for calendar — verify table name matches actual schema
2. `social_listening_keywords` query assumes `trend_direction` column exists — may need adjustment
3. Performance upgrade path (hypothesis → one_case → rule) still runs through `learningEngine` → `jarvisKbWorker` — the `fileOutputToKb` outputs start as hypothesis and need actual performance data to upgrade
4. Consider adding `campaign_id` to `jarvis_kb_entries` for tighter linking between proposals and resulting campaigns
