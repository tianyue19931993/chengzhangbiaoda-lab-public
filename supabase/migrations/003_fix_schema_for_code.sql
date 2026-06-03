-- Migration 003: 修复数据库 Schema 以匹配代码实际使用
-- 日期: 2026-06-03
-- 说明: 代码中使用了这些字段，但数据库中不存在
-- ⚠️ 请在 Supabase Dashboard → SQL Editor 中执行此文件

-- ============================================================
-- 1. projects 表添加缺失字段
-- ============================================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS storyboard_image_url TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMPTZ;

COMMENT ON COLUMN projects.storyboard_image_url IS '老师上传的九宫格分镜图URL';
COMMENT ON COLUMN projects.video_url IS '老师上传的动画视频URL';
COMMENT ON COLUMN projects.processing_at IS '开始处理时间';
COMMENT ON COLUMN projects.completed_at IS '完成时间';
COMMENT ON COLUMN projects.downloaded_at IS '下载时间';

-- ============================================================
-- 2. 确保 export_logs 表存在（如果不存在则创建）
-- ============================================================
CREATE TABLE IF NOT EXISTS export_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  teacher_id  TEXT NOT NULL DEFAULT 'system',
  format      TEXT NOT NULL,           -- 'storyboard' | 'video'
  file_url    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_export_logs_project ON export_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_format  ON export_logs(format);

-- RLS
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. 验证结果
-- ============================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;
