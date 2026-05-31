-- ============================================================================
-- 004_grouping_versioning.sql
-- Adds version lineage to groupings and switches the registry to an
-- open-publish model (community proposals go live immediately; policing
-- happens after the fact via the report-a-problem channel).
--
-- Run this BEFORE deploying the app code that depends on these columns.
-- ============================================================================

ALTER TABLE groupings
  ADD COLUMN IF NOT EXISTS version_label      TEXT,
  ADD COLUMN IF NOT EXISTS parent_grouping_id UUID REFERENCES groupings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_groupings_parent ON groupings(parent_grouping_id);

-- Backfill existing seed groupings ("G01".."G08") as base versions ("G01.1"..)
UPDATE groupings
SET version_label = (regexp_match(title, '^(G\d+)'))[1] || '.1'
WHERE version_label IS NULL
  AND title ~ '^G\d+';

-- Open-publish: make existing seed groupings publicly visible
UPDATE groupings
SET is_published = TRUE,
    published_at = COALESCE(published_at, now()),
    status       = CASE WHEN status = 'neutral default' THEN 'published hypothesis' ELSE status END
WHERE record_id = 'MA-BJ-NW-SLAB-02'
  AND is_published = FALSE;
