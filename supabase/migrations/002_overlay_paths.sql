-- ============================================================================
-- MAPSA — Migration 002: Overlay paths + sort order for elements
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================================

-- Add overlay PNG path columns to elements table
ALTER TABLE elements
  ADD COLUMN IF NOT EXISTS overlay_path TEXT,           -- e.g. "MA-BJ-NW-SLAB-02/E01.png"
  ADD COLUMN IF NOT EXISTS inferred_overlay_path TEXT,  -- e.g. "MA-BJ-NW-SLAB-02/E05-INFERRED.png"
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- Add background image path to records table
ALTER TABLE records
  ADD COLUMN IF NOT EXISTS background_path TEXT,        -- base photograph for overlay composition
  ADD COLUMN IF NOT EXISTS base_overlay_path TEXT;       -- full line-drawing overlay (background.png)

-- Make bbox columns nullable (PNG overlays don't need bounding boxes)
ALTER TABLE elements
  ALTER COLUMN bbox_x DROP NOT NULL,
  ALTER COLUMN bbox_y DROP NOT NULL,
  ALTER COLUMN bbox_width DROP NOT NULL,
  ALTER COLUMN bbox_height DROP NOT NULL;

-- Set defaults for nullable bbox columns
ALTER TABLE elements
  ALTER COLUMN bbox_x SET DEFAULT 0,
  ALTER COLUMN bbox_y SET DEFAULT 0,
  ALTER COLUMN bbox_width SET DEFAULT 0,
  ALTER COLUMN bbox_height SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_elements_sort ON elements(record_id, sort_order);
