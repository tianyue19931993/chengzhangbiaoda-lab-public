-- ============================================================
-- 手动清理脚本 - 删除超过 7 天的数据
-- 使用方法：在 Supabase SQL Editor 中执行
-- 
-- 逻辑：以当前日期为基准，往前推 7 天，这之前的数据删除
-- 例如：今天是 2026-06-04，则删除 2026-05-27 之前的数据
-- ============================================================

-- 1. 先查看将要删除的数据（预览，不执行删除）
-- 确认无误后再执行下面的删除语句

-- 预览 projects 表
SELECT 
  id,
  child_name,
  project_name,
  created_at,
  original_image_url,
  storyboard_image_url,
  video_url
FROM projects
WHERE created_at < (CURRENT_DATE - INTERVAL '7 days')::timestamp
ORDER BY created_at DESC;

-- 预览 users 表
SELECT 
  id,
  name,
  student_code,
  institution,
  activity_date,
  session_number,
  created_at
FROM users
WHERE created_at < (CURRENT_DATE - INTERVAL '7 days')::timestamp
ORDER BY created_at DESC;

-- 统计将要删除的数量
SELECT 
  'projects' as table_name,
  COUNT(*) as will_delete
FROM projects
WHERE created_at < (CURRENT_DATE - INTERVAL '7 days')::timestamp
UNION ALL
SELECT 
  'users' as table_name,
  COUNT(*) as will_delete
FROM users
WHERE created_at < (CURRENT_DATE - INTERVAL '7 days')::timestamp;

-- ============================================================
-- 2. 执行删除（谨慎操作！）
-- ============================================================

-- 删除超过 7 天的 projects 记录
-- 注意：会级联删除 export_logs 表的关联记录（如果有外键约束）
DELETE FROM projects
WHERE created_at < (CURRENT_DATE - INTERVAL '7 days')::timestamp;

-- 删除超过 7 天的 users 记录
-- 注意：如果有外键约束，可能需要先删除关联的 projects
DELETE FROM users
WHERE created_at < (CURRENT_DATE - INTERVAL '7 days')::timestamp;

-- ============================================================
-- 3. 可选：清理 export_logs 表
-- ============================================================

-- 删除超过 7 天的导出日志
DELETE FROM export_logs
WHERE created_at < (CURRENT_DATE - INTERVAL '7 days')::timestamp;

-- ============================================================
-- 4. 验证删除结果
-- ============================================================

-- 检查剩余数据
SELECT 
  'projects' as table_name,
  COUNT(*) as remaining_count,
  MIN(created_at) as earliest_date,
  MAX(created_at) as latest_date
FROM projects
UNION ALL
SELECT 
  'users' as table_name,
  COUNT(*) as remaining_count,
  MIN(created_at) as earliest_date,
  MAX(created_at) as latest_date
FROM users;

-- ============================================================
-- 注意事项：
-- 
-- 1. 七牛云的文件会由 Vercel Cron Job 自动清理
--    本脚本只清理数据库记录
-- 
-- 2. 如果需要保留某些数据，可以在 DELETE 语句中加条件：
--    DELETE FROM projects
--    WHERE created_at < (CURRENT_DATE - INTERVAL '7 days')::timestamp
--      AND id NOT IN (1, 2, 3);  -- 排除特定 ID
-- 
-- 3. 建议先执行预览语句确认后再执行删除
-- ============================================================
