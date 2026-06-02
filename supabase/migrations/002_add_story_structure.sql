-- Migration 002: 添加故事结构化字段、角色设定、分镜场景标题
-- 日期: 2026-06-02

-- 1. projects 表添加新字段
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS child_name TEXT,
  ADD COLUMN IF NOT EXISTS theme TEXT,
  ADD COLUMN IF NOT EXISTS hero_design JSONB,
  ADD COLUMN IF NOT EXISTS storyboard JSONB;

-- 2. images 表添加 scene_title 字段
ALTER TABLE images
  ADD COLUMN IF NOT EXISTS scene_title TEXT;

-- 3. videos 表添加时长字段
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '16:9';

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_child_name ON projects(child_name);

COMMENT ON COLUMN projects.child_name IS '小朋友名字';
COMMENT ON COLUMN projects.theme IS '故事主题，如：成长、勇气、友谊';
COMMENT ON COLUMN projects.hero_design IS '角色设定JSON，包含 name/species/fur_color/clothes/item 等';
COMMENT ON COLUMN projects.storyboard IS '分镜剧情JSON数组，包含 scene/title/description';
COMMENT ON COLUMN images.scene_title IS '分镜场景标题，如：英雄原本生活、问题出现';
COMMENT ON COLUMN videos.duration IS '视频时长（秒），默认15秒';
COMMENT ON COLUMN videos.aspect_ratio IS '视频比例，默认16:9';
