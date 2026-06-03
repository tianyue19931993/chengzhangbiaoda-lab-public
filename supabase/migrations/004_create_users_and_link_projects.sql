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

-- 6. 测试数据
INSERT INTO public.users (student_code, name, institution, activity_date, session_number) VALUES
  ('1',  '张三', '武宁路实验小学', '2026-05-30', 1),
  ('2',  '李四', '武宁路实验小学', '2026-05-30', 1),
  ('3',  '王五', '武宁路实验小学', '2026-05-30', 1),
  ('4',  '赵六', '武宁路实验小学', '2026-05-30', 1),
  ('5',  '钱七', '武宁路实验小学', '2026-05-30', 1),
  ('6',  '孙八', '普通小学',         '2026-05-30', 2),
  ('7',  '周九', '普通小学',         '2026-05-30', 2),
  ('8',  '吴十', '普通小学',         '2026-05-30', 2),
  ('9',  '妮妮', '普通小学',         '2026-05-30', 2),
  ('10', '小明', '普通小学',         '2026-05-30', 2)
ON CONFLICT (student_code) DO NOTHING;
