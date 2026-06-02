# 🎨 MR 研学馆 - 儿童 AI 创意动画平台

基于 Next.js 15 + Supabase + Playwright 的儿童创意动画生成平台 MVP。

## 📊 项目定位

让孩子的创意绘画变成动画故事：
1. 上传创意纸（绘画）
2. AI 理解创意（豆包 AI）
3. 生成故事和分镜（豆包 AI）
4. 生成九宫格图片（即梦 AI）
5. 生成动画视频（即梦 Seedance 2.0）
6. 下载作品

## 🏗️ 技术架构

```
Next.js 15 (App Router + TypeScript + TailwindCSS)
          ↓
    Playwright 自动化
          ↓
  ┌───────┴───────┐
  ↓                   ↓
豆包 AI            即梦 AI
- OCR               - 九宫格生成
- 图片理解           - 视频生成
- 故事生成
- Prompt 生成
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd mr-animation-lab
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.local.example` 到 `.env.local` 并填写配置：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```env
# Supabase 配置（必填）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 即梦 Cookie（必填，先手动登录获取）
JIMENG_COOKIES=

# 风格系统
DEFAULT_STYLE=pixar
DEFAULT_STYLE_PROMPT=Pixar animation style, 3D animated movie...

# 文件清理
FILE_RETENTION_DAYS=7

# Playwright
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=300000
```

### 4. 设置 Supabase

#### 4.1 创建 Supabase 项目
- 访问 [Supabase](https://supabase.com)
- 创建新项目
- 获取 URL 和 API Keys

#### 4.2 创建数据库 Schema

在 Supabase SQL Editor 中运行 `supabase/schema.sql`：

```sql
-- 复制 supabase/schema.sql 的内容并运行
```

#### 4.3 创建 Storage Buckets

在 Supabase Dashboard → Storage 中创建以下 Buckets：
- `original-images` - 存储上传的创意纸原图
- `generated-images` - 存储生成的九宫格图片
- `videos` - 存储生成的视频

设置 Buckets 为 Public（用于访问文件）。

### 5. 获取即梦 Cookie

因为 MVP 使用浏览器自动化（无需官方 API），需要：

1. **手动登录即梦**：
   - 访问 https://jimeng.jianying.com
   - 登录账号
   - 打开浏览器开发者工具（F12）
   - 进入 Application → Cookies
   - 复制所有 Cookie

2. **保存到文件**：
   - 创建 `playwright/.cache/jimeng-cookies.json`
   - 将 Cookie 数组粘贴进去

（豆包 Cookie 同理）

### 6. 运行开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 📂 项目结构

```
mr-animation-lab/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   ├── upload/        # 文件上传
│   │   │   ├── generate-story/   # 豆包生成故事
│   │   │   ├── generate-images/  # 即梦生成图片
│   │   │   ├── generate-video/   # 即梦生成视频
│   │   │   └── projects/...       # 项目管理
│   │   ├── upload/            # 上传页面
│   │   ├── my-works/         # 作品列表
│   │   └── projects/[id]/    # 项目详情
│   ├── components/            # React 组件
│   ├── lib/                  # 工具库
│   ├── types/                # TypeScript 类型
│   └── styles/               # 全局样式
├── playwright/               # Playwright 自动化
│   ├── cookie-manager.ts     # Cookie 管理
│   ├── douyin-automation.ts  # 豆包自动化
│   ├── jimeng-automation.ts  # 即梦自动化
│   └── video-poller.ts       # 视频轮询
├── supabase/                # Supabase 配置
│   └── schema.sql           # 数据库 Schema
├── scripts/                 # 脚本
│   └── cleanup.ts          # 7 天自动清理
└── public/                  # 静态资源
```

## 🔧 核心功能

### 1. 文件上传

- 支持 JPG、JPEG、PNG
- 最大 10MB
- 上传到 Supabase Storage

### 2. AI 理解（豆包）

通过 Playwright 自动化操作豆包网页：
- OCR 识别
- 图片理解
- 故事生成
- Prompt 生成

### 3. 九宫格生成（即梦）

通过 Playwright 自动化操作即梦网页：
- 生成 9 张分镜图
- 支持风格切换
- 每张图可单独重生（免费 1 次）

### 4. 视频生成（即梦 Seedance 2.0）

通过 Playwright 自动化操作即梦网页：
- 使用 Seedance 2.0 模型
- 720P、10 秒
- 异步任务，轮询状态
- 首次免费，后续 ¥9.9/次

### 5. 7 天自动清理

定时清理超过 7 天的项目：
- 删除 Storage 文件
- 删除数据库记录

手动运行：
```bash
npm run cleanup
```

或使用 Cron Job 定时运行。

## 🎨 风格系统

支持 5 种风格：
1. **Pixar 3D** - 迪士尼皮克斯风格（默认）
2. **国风** - 中国古风
3. **二次元** - 日本动漫风格
4. **水彩** - 水彩画风格
5. **赛博朋克** - 未来科幻风格

## 👨‍🏫 老师后台

老师可以：
- 查看全部孩子作品
- 作品列表
- 九宫格查看
- 视频播放
- 大屏轮播
- 全屏展示

（路径：`/teacher/dashboard`，需实现登录系统）

## 🚀 部署到 Vercel

### 1. 推送代码到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. 在 Vercel 中导入项目

- 访问 [Vercel](https://vercel.com)
- 导入 GitHub 仓库
- 配置环境变量（复制 `.env.local` 中的内容）
- 部署

⚠️ **注意**：Playwright 在 Vercel 上可能需要特殊配置（建议使用 Vercel Playwright 构建包）。

## ⚠️ 当前限制（MVP）

1. **无官方 API**：使用浏览器自动化，不稳定
2. **需要手动登录**：Cookie 过期后需重新登录
3. **无用户系统**：使用模拟用户 ID
4. **无支付系统**：视频付费功能未实现
5. **Playwright 在 Serverless 环境**：可能需要改为长时间运行的服务器

## 🔮 未来升级方向

1. **切换官方 API**：豆包 API + 即梦 API
2. **完整用户系统**：注册、登录、权限管理
3. **支付集成**：微信支付、支付宝
4. **优化体验**：实时进度推送（WebSocket）
5. **社区功能**：分享、点赞、评论

## 📝 开发笔记

### Playwright 自动化注意事项

1. **即梦页面结构可能变化**：需要定期维护选择器
2. **Cookie 过期**：需要重新登录并保存 Cookie
3. **视频生成超时**：即梦视频生成可能需要 5-10 分钟

### Supabase 安全

1. **启用 RLS**：在 Supabase 中启用 Row Level Security
2. **设置策略**：孩子只能查看自己的作品
3. **Service Role Key 保密**：不要暴露在前端

## 📧 联系方式

如有问题，请联系：[your-email@example.com]

---

**祝孩子们创作愉快！** 🎨🎬✨
