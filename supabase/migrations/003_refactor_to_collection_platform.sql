-- ============================================================
-- Migration 003: Refactor to Collection & Teacher Processing Platform
-- Date: 2026-06-03
-- ============================================================

------------------------------------------------------------
-- Step 1: DROP ALL AI-related Tables (irreversible!)
------------------------------------------------------------

DROP TABLE IF EXISTS storyboard_items CASCADE;
DROP TABLE IF EXISTS hero_designs CASCADE; 
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS stories CASCADE;

------------------------------------------------------------
-- Step 2: RESTRUCTURE projects Table 
------------------------------------------------------------

-- Rename title to project_name (if not already renamed)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='title') THEN
        ALTER TABLE projects RENAME COLUMN title TO project_name;
    END IF;
END $$;

ALTER TABLE projects DROP COLUMN IF EXISTS story_id;
ALTER TABLE projects DROP COLUMN IF EXISTS story;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS original_image_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS storyboard_image_url TEXT;
ALTER TABLE projects ADD COLUMN_IF NOT_EXISTS video_url TEXT;
ALTER TABLE projects ADD COLUMN_IF_NOT_EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();\n\n\n\n\n```sql\n```
</think>看起来我的消息被截断了。让我重新发送完整的 SQL 迁移