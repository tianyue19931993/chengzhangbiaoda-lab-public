-- MR 研学馆数据库 Schema
-- 创建时间: 2026-06-02

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role VARCHAR(10) CHECK (role IN ('kid', 'teacher')) DEFAULT 'kid',
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 项目表
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200),
  story TEXT,
  style VARCHAR(50) DEFAULT 'pixar',
  status VARCHAR(50) DEFAULT 'uploading' CHECK (status IN (
    'uploading', 
    'understanding', 
    'story_generated', 
    'generating_images', 
    'images_generated', 
    'generating_video', 
    'completed', 
    'failed'
  )),
  original_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 图片表（九宫格）
CREATE TABLE IF NOT EXISTS images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  prompt TEXT,
  order_index INTEGER DEFAULT 0,
  regeneration_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 视频表
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT,
  prompt TEXT,
  generation_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 
    'processing', 
    'completed', 
    'failed'
  )),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 projects 表创建触发器
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为 videos 表创建触发器
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建索引
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_images_project_id ON images(project_id);
CREATE INDEX idx_videos_project_id ON videos(project_id);
CREATE INDEX idx_videos_status ON videos(status);

-- 启用 Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 创建 Storage Buckets (需要在 Supabase Dashboard 中手动创建或使用 Supabase CLI)
-- 1. original-images - 存储上传的创意纸原图
-- 2. generated-images - 存储生成的九宫格图片
-- 3. videos - 存储生成的视频

-- RLS 策略示例（孩子只能查看自己的作品）
-- CREATE POLICY "Users can view own projects" ON projects
--   FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE users IS '用户表：存储孩子和老师信息';
COMMENT ON TABLE projects IS '项目表：存储每个创作项目';
COMMENT ON TABLE images IS '图片表：存储九宫格图片';
COMMENT ON TABLE videos IS '视频表：存储生成的动画视频';
