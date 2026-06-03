-- ============================================
-- 004_create_users_and_link_projects.sql
-- 创建学生表 + 关联 projects 表
-- 执行方式：复制到 Supabase Dashboard → SQL Editor → Run
-- ============================================

-- 1. 创建学生用户表
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code  TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  institution   TEXT NOT NULL,
  activity_date DATE NOT NULL,
  session_number INTEGER NOT NULL CHECK (session_number BETWEEN 1 AND 10),
  phone         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 启用 RLS（行级安全）
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. RLS 策略：公开读写（研学当天学生需要查询自己）
CREATE POLICY "Allow public read"  ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.users FOR UPDATE USING (true);

-- 4. 给 projects 表加 user_id 关联字段
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);

-- 5. 索引，加速查询
CREATE INDEX IF NOT EXISTS idx_users_activity_date ON public.users(activity_date);
CREATE INDEX IF NOT EXISTS idx_users_name            ON public.users(name);
CREATE INDEX IF NOT EXISTS idx_projects_user_id      ON public.projects(user_id);

-- 6. 插入几条测试数据（机构可按需修改）
INSERT INTO public.users (student_code, name, institution, activity_date, session_number) VALUES
  ('20260530-001', '张三', '武宁路实验小学', '2026-05-30', 1),
  ('20260530-002', '李四', '武宁路实验小学', '2026-05-30', 1),
  ('20260530-003', '王五', '武宁路实验小学', '2026-05-30', 1),
  ('20260530-004', '赵六', '武宁路实验小学', '2026-05-30', 1),
  ('20260530-005', '钱七', '武宁路实验小学', '2026-05-30', 1),
  ('20260530-001', '孙八', '武宁路实验小学', '2026-05-30', 2),
  ('20260530-002', '周九', '武宁路实验小学', '2026-05-30', 2),
  ('20260530-003', '吴十', '武宁路实验小学', '2026-05-30', 2),
  ('20260603-001', '妮妮', '武宁路实验小学', '2026-06-03', 1),
  ('20260603-002', '小明', '武宁路实验小学', '2026-06-03', 1)
ON CONFLICT (student_code) DO NOTHING;
