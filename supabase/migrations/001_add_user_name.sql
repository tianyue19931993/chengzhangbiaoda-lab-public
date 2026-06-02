-- MR 研学馆：users 表添加 name 字段迁移
-- 在 Supabase Dashboard → SQL Editor 中执行此文件

-- 1. 如果 name 字段不存在则添加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'name'
  ) THEN
    ALTER TABLE users ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT '小朋友';
    RAISE NOTICE '已添加 name 字段';
  ELSE
    RAISE NOTICE 'name 字段已存在，跳过添加';
  END IF;
END
$$;

-- 2. 如果现有记录的 name 为空或 '小朋友'，可以先查看
-- SELECT id, name FROM users LIMIT 10;

-- 3. 如需将 name 改为 NOT NULL（如果还没设置）
-- ALTER TABLE users ALTER COLUMN name SET NOT NULL;

COMMENT ON COLUMN users.name IS '小朋友的名字，必填';
