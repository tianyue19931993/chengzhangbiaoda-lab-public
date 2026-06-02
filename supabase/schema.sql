-- ============================================================
-- MR + AI 研学馆 数据库 Schema V1.0
-- 对应 PRD：https://www.digit3ds.com
-- ============================================================

-- ---------- 用户表 ----------
CREATE TABLE IF NOT EXISTS users (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role       VARCHAR(10) CHECK (role IN ('kid', 'teacher')) DEFAULT 'kid',
  name       VARCHAR(100) NOT NULL DEFAULT '小朋友',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 风格表 (styles) ----------
CREATE TABLE IF NOT EXISTS styles (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  prompt  TEXT NOT NULL  -- imagePromptSuffix
);

-- Seed: 五种预设风格
INSERT INTO styles (id, name, prompt) VALUES
  ('pixar',     '🎬 Pixar 3D 动画风', 'Pixar animation style, Disney Pixar style, 3D animated movie, cinematic lighting, cute character, high quality rendering, soft global illumination, stylized proportions, expressive facial animation, vibrant colors, cinematic composition, animated film aesthetic, warm atmosphere, high detail, emotional storytelling, dynamic camera, dreamy lighting'),
  ('chinese',   '🏮 国风',            'Chinese fantasy style, ancient Chinese aesthetics, traditional Chinese painting, xianxia atmosphere, oriental fantasy, ink wash texture, elegant composition, flowing costume, Chinese mythology inspired, golden light, misty mountains, ethereal environment, traditional architecture, soft watercolor ink, poetic cinematic lighting, fantasy Chinese world, high detail, dreamlike atmosphere'),
  ('anime',     '🌸 二次元',          'anime style, Japanese animation, highly detailed anime art, vibrant anime colors, dynamic action pose, beautiful anime eyes, cinematic anime lighting, fantasy anime world, soft shading, clean line art, Makoto Shinkai inspired, high emotional impact, cute anime character, dramatic composition, anime movie aesthetic, stylized environment, dynamic perspective'),
  ('watercolor','🎨 水彩',            'watercolor illustration, storybook painting, soft watercolor texture, hand-painted style, gentle pastel colors, paper grain texture, dreamy atmosphere, children''s book illustration, soft edges, warm artistic feeling, delicate brush strokes, illustrated fantasy world, light watercolor wash, cozy and magical, poetic composition, traditional watercolor aesthetic'),
  ('cyberpunk', '🌃 赛博朋克',        'cyberpunk style, futuristic neon city, glowing holograms, sci-fi atmosphere, high-tech environment, neon lighting, cinematic cyberpunk aesthetic, purple and blue neon, digital world, futuristic character design, dramatic lighting, rainy cyberpunk city, glowing particles, high contrast, sci-fi cinematic composition, Blade Runner inspired, ultra detailed')
ON CONFLICT (id) DO NOTHING;

-- ---------- 项目表 (projects) ----------
-- 状态说明：
--   drafting       已创建（草稿）
--   story_done      故事完成
--   storyboard_done 分镜完成
--   video_done      视频完成
CREATE TABLE IF NOT EXISTS projects (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  child_name        TEXT NOT NULL DEFAULT '小朋友',
  style_id          TEXT REFERENCES styles(id) DEFAULT 'pixar',
  uploaded_image    TEXT,   -- original-image URL
  title             TEXT,   -- 故事标题
  story             TEXT,   -- 故事正文
  video_prompt      TEXT,   -- 视频生成 Prompt
  status            TEXT DEFAULT 'drafting'
                    CHECK (status IN ('drafting','story_done','storyboard_done','video_done','failed')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 角色设定表 (hero_designs) ----------
CREATE TABLE IF NOT EXISTS hero_designs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT,
  species    TEXT,
  color      TEXT,
  costume    TEXT,
  prop       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 九宫格分镜表 (storyboard_items) ----------
-- 每条记录对应一个分镜格，sort_order 固定 1-9
CREATE TABLE IF NOT EXISTS storyboard_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  sort_order   INTEGER NOT NULL CHECK (sort_order BETWEEN 1 AND 9),
  title        TEXT,
  description  TEXT,
  prompt       TEXT,
  image_url    TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','generating','success','failed')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 视频表 (videos) ----------
CREATE TABLE IF NOT EXISTS videos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
  url              TEXT,
  prompt           TEXT,
  generation_count INTEGER DEFAULT 0,
  status           TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','completed','failed')),
  error_message    TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 触发器：自动更新 updated_at ----------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated  BEFORE UPDATE ON projects  ON EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_videos_updated   BEFORE UPDATE ON videos   ON EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------- 索引 ----------
CREATE INDEX IF NOT EXISTS idx_projects_user_id     ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status       ON projects(status);
CREATE INDEX IF NOT EXISTS idx_hero_designs_project  ON hero_designs(project_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_project    ON storyboard_items(project_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_sort       ON storyboard_items(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_videos_project        ON videos(project_id);

-- ---------- RLS ----------
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_designs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE storyboard_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles         ENABLE ROW LEVEL SECURITY;

-- service_role 绕过所有 RLS（本项目 serverless API 使用 service_role key）
