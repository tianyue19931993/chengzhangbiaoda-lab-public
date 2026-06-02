'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ── 无 API 降级：获取默认数据 ──────────────────────
interface DefaultData {
  story?: any;
  hero?: any;
  storyboard?: any[];
  video?: any;
}

async function fetchDefaultData(): Promise<DefaultData | null> {
  try {
    const res = await fetch('/api/default-data');
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

async function fetchConfig(): Promise<{ hasAnyApi: boolean }> {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    return { hasAnyApi: data.data?.hasAnyApi ?? false };
  } catch {
    return { hasAnyApi: false };
  }
}

// ── 类型定义 ──────────────────────────────────────────────
interface HeroDesign {
  name: string;
  species: string;
  color: string;
  costume: string;
  prop: string;
}

interface StoryboardItem {
  id: string;
  sort_order: number;
  title: string;
  description: string;
  prompt: string;
  image_url: string | null;
  status: 'pending' | 'generating' | 'success' | 'failed';
}

interface Video {
  id: string;
  url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generation_count: number;
}

interface Project {
  id: string;
  child_name: string;
  title: string;
  story: string;
  story_content?: string;
  style_id: string;
  uploaded_image: string;
  status: string;
  created_at: string;
  hero_designs: HeroDesign | null;
  storyboard_items: StoryboardItem[];
  videos: Video[];
}

// ── 风格映射 ──────────────────────────────────────────────
const STYLE_NAMES: Record<string, string> = {
  pixar:     '🎬 Pixar 3D',
  chinese:   '🏮 国风',
  anime:     '🌸 二次元',
  watercolor:'🎨 水彩',
  cyberpunk: '🌃 赛博朋克',
};

// ── Lightbox 组件 ──────────────────────────────────────────
function Lightbox({
  item,
  onClose,
  onSave,
  onRegenerate,
}: {
  item: StoryboardItem;
  onClose: () => void;
  onSave: (prompt: string) => void;
  onRegenerate: (prompt: string) => void;
}) {
  const [editPrompt, setEditPrompt] = useState(item.prompt);
  const [saving, setSaving] = useState(false);
  const [regen, setRegen] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editPrompt);
    } finally {
      setSaving(false);
    }
  };

  const handleRegen = async () => {
    setRegen(true);
    try {
      await onRegenerate(editPrompt);
      onClose();
    } finally {
      setRegen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-3xl z-10">
          <h3 className="text-xl font-bold text-gray-800">
            🎬 分镜 {item.sort_order}「{item.title}」
          </h3>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-gray-700 leading-none">×</button>
        </div>

        {/* 图片预览 */}
        {item.image_url && (
          <div className="p-4">
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full rounded-2xl shadow-lg"
            />
          </div>
        )}

        {/* Prompt 编辑 */}
        <div className="p-4 border-t">
          <label className="block text-sm font-bold text-gray-700 mb-2">Prompt（可编辑）</label>
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            rows={5}
            placeholder="输入分镜图的生图 Prompt，留空将使用默认 Prompt..."
            className="w-full border-2 border-purple-300 rounded-xl p-3 text-sm font-mono focus:border-purple-500 focus:outline-none resize-y"
          />
          <div className="flex gap-3 mt-3 justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-400 text-white rounded-xl font-bold hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {saving ? '⏳ 保存中...' : '💾 保存 Prompt'}
            </button>
            <button
              onClick={handleRegen}
              disabled={regen}
              className="px-6 py-2 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 disabled:opacity-50 transition-colors"
            >
              {regen ? '⏳ 生成中...' : '🔄 重新生成'}
            </button>
          </div>
        </div>

        {/* 下载按钮 */}
        {item.image_url && (
          <div className="p-4 border-t flex justify-end">
            <a
              href={item.image_url}
              download={`分镜${item.sort_order}_${item.title}.png`}
              className="px-6 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
            >
              ⬇️ 下载图片
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 九宫格卡片组件 ────────────────────────────────────────
function StoryboardCard({
  item,
  styleId,
  projectId,
  onUpdated,
}: {
  item: StoryboardItem;
  styleId: string;
  projectId: string;
  onUpdated: (updated: StoryboardItem) => void;
}) {
  const [lightbox, setLightbox] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);

  const handleSavePrompt = async (prompt: string) => {
    const res = await fetch('/api/regenerate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, sortOrder: item.sort_order, prompt }),
    });
    const data = await res.json();
    if (!data.success) alert(`❌ 保存失败: ${data.error}`);
  };

  const handleRegenerate = async (prompt: string) => {
    setRegenLoading(true);
    try {
      const res = await fetch('/api/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sortOrder: item.sort_order, prompt }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        onUpdated({ ...item, image_url: data.data.url, prompt, status: 'success' });
      } else {
        alert(`❌ 生成失败: ${data.error}`);
      }
    } finally {
      setRegenLoading(false);
    }
  };

  const paletteColors: Record<string, string> = {
    pixar:     'from-blue-400 to-purple-500',
    chinese:   'from-red-500 to-yellow-500',
    anime:     'from-pink-400 to-rose-500',
    watercolor:'from-sky-400 to-teal-400',
    cyberpunk: 'from-indigo-900 to-purple-900',
  };
  const colorClass = paletteColors[styleId] ?? paletteColors.pixar;

  return (
    <>
      <div
        className={`relative rounded-2xl overflow-hidden shadow-lg cursor-pointer group transition-transform hover:scale-105 ${
          item.status === 'success' ? 'aspect-video' : 'aspect-video'
        }`}
                onClick={() => setLightbox(true)}
      >
        {/* 渐变背景/图片 */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colorClass}`}>
          {item.status === 'success' && item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/60">
              {item.status === 'generating' ? (
                <div className="text-center">
                  <div className="text-4xl animate-spin mb-2">⏳</div>
                  <p className="text-sm font-bold">生成中...</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-5xl mb-2">🎨</div>
                  <p className="text-sm font-bold">{item.title}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 分镜序号 */}
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full">
          {item.sort_order}
        </div>

        {/* 分镜标题 */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <p className="text-white text-xs font-bold truncate">{item.title}</p>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          item={item}
          onClose={() => setLightbox(false)}
          onSave={handleSavePrompt}
          onRegenerate={handleRegenerate}
        />
      )}
    </>
  );
}

// ── 主页面 ────────────────────────────────────────────────
export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // ── 无 API 降级状态 ──
  const [hasAnyApi, setHasAnyApi]           = useState<boolean | null>(null);
  const [defaultData, setDefaultData]         = useState<DefaultData | null>(null);
  const [project, setProject]       = useState<Project | null>(null);
  const [loading, setLoading]        = useState(true);
  const [error, setError]            = useState('');
  const [projectId, setProjectId]   = useState<string>('');

  // 编辑状态
  const [editingTitle, setEditingTitle]   = useState('');
  const [editingStory, setEditingStory]   = useState('');
  const [savingText, setSavingText]       = useState(false);

  // 跟踪是否已加载过（避免轮询覆盖用户输入）
  const initialLoaded = useRef(false);

  const [editingHero, setEditingHero]     = useState<HeroDesign | null>(null);
  const [savingHero, setSavingHero]       = useState(false);

  // 视频生成
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoError, setVideoError]           = useState('');

  // 轮询 ref
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 解析 params ────────────────────────────────────────
  useEffect(() => {
    params.then(({ id }) => setProjectId(id));
  }, [params]);

  // ── 检查 API 配置 + 拉取默认数据 ──
  useEffect(() => {
    fetchConfig().then(({ hasAnyApi }) => {
      setHasAnyApi(hasAnyApi);
      if (!hasAnyApi) {
        fetchDefaultData().then(setDefaultData);
      }
    });
  }, []);

  // ── 加载项目 ───────────────────────────────────────────
  const loadProject = useCallback(async (id: string) => {
    try {
      const res  = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }

      const p: Project = data.data.project;

      // 规范化字段（兼容旧表结构）
      if (!p.hero_designs && (p as any).hero_design) {
        try {
          p.hero_designs = typeof (p as any).hero_design === 'string'
            ? JSON.parse((p as any).hero_design)
            : (p as any).hero_design;
        } catch { p.hero_designs = null; }
      }
      if (!p.storyboard_items && (p as any).storyboard) {
        try {
          p.storyboard_items = typeof (p as any).storyboard === 'string'
            ? JSON.parse((p as any).storyboard)
            : (p as any).storyboard;
        } catch { p.storyboard_items = []; }
      }
      if (!p.videos) p.videos = [];

      // 如果 storyboard_items 为空（从旧结构迁入），生成默认 9 条
      if (!p.storyboard_items || p.storyboard_items.length === 0) {
        // 无 API 时尝试用默认分镜数据
        if (defaultData?.storyboard && defaultData.storyboard.length > 0) {
          p.storyboard_items = defaultData.storyboard.map((s: any, i: number) => ({
            id:          s.id ?? `default-${i}`,
            sort_order:  s.sort_order ?? i + 1,
            title:       s.title ?? `分镜 ${i + 1}`,
            description: s.description ?? '',
            prompt:      s.prompt ?? '',
            image_url:   s.image_url ?? null,
            status:      s.image_url ? 'success' as const : 'pending' as const,
          }));
        } else {
          p.storyboard_items = Array.from({ length: 9 }, (_, i) => ({
            id:          `placeholder-${i}`,
            sort_order:  i + 1,
            title:       ['英雄原本生活','问题出现','接受任务','遇到困难','获得帮助','开始成长','真相浮现','最终挑战','英雄归来'][i],
            description: '',
            prompt:      '',
            image_url:   null,
            status:      'pending',
          }));
        }
      }

      setProject(p);

      // 无 API 时：用默认数据填补展示
      if (!hasAnyApi && defaultData) {
        if (defaultData.hero && !p.hero_designs?.name) {
          p.hero_designs = defaultData.hero;
        }
      }

      // 只在首次加载时设置编辑值，后续轮询不覆盖用户输入
      if (!initialLoaded.current) {
        setEditingTitle(p.title ?? '');
        // 无 API 时用默认故事填入编辑区
        const initialStory = (p as any).story_content ?? p.story ?? '';
        setEditingStory(!initialStory && defaultData?.story?.content ? defaultData.story.content : initialStory);
        setEditingHero(p.hero_designs ?? { name:'', species:'', color:'', costume:'', prop:'' });
        initialLoaded.current = true;
      }
      // 轮询时：只同步 hero_designs（不在编辑状态）
      else {
        setEditingHero(p.hero_designs ?? { name:'', species:'', color:'', costume:'', prop:'' });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!projectId) return;
    loadProject(projectId);

    // 只在图片/视频生成中时才轮询，编辑状态下不轮询避免覆盖输入
    const generatingStatuses = ['drafting', 'story_done'];
    pollingRef.current = setInterval(() => {
      if (!project || !generatingStatuses.includes(project.status)) return;
      loadProject(projectId);
    }, 8000);

    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [projectId, loadProject, project?.status]);

  // ── 保存标题/故事 ──────────────────────────────────────
  const [saveErr, setSaveErr] = useState('');
  const saveText = async () => {
    setSavingText(true);
    setSaveErr('');
    try {
      const res  = await fetch(`/api/projects/${projectId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: editingTitle, story_content: editingStory }),
      });
      const data = await res.json();
      if (data.success) {
        setProject((p) => p ? { ...p, title: editingTitle, story: editingStory } : p);
      } else {
        setSaveErr(data.error ?? '保存失败');
      }
    } catch (e: any) {
      setSaveErr(e.message ?? '网络错误');
    } finally {
      setSavingText(false);
    }
  };

  // ── 保存角色设定 ───────────────────────────────────────
  const saveHero = async () => {
    if (!editingHero) return;
    setSavingHero(true);
    try {
      const res  = await fetch(`/api/projects/${projectId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ hero_design: editingHero }),
      });
      const data = await res.json();
      if (data.success) {
        setProject((p) => p ? { ...p, hero_designs: editingHero } : p);
      }
    } finally {
      setSavingHero(false);
    }
  };

  // ── 生成全部九宫格 ─────────────────────────────────────
  const generateAllImages = async () => {
    // 无 API 时：直接用默认分镜（已填入 project.storyboard_items），仅提示用户
    if (!hasAnyApi) {
      alert('⚠️ 当前未配置 AI API，已展示默认示例分镜图。\n配置 API 后可生成专属分镜。');
      return;
    }
    const res  = await fetch('/api/generate-images', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ projectId, style: project?.style_id ?? 'pixar' }),
    });
    const data = await res.json();
    if (!data.success) alert(`❌ 生成失败: ${data.error}`);
    // 轮询会自更新
  };

  // ── 生成视频 ───────────────────────────────────────────
  const generateVideo = async () => {
    // 无 API 时：直接展示默认视频
    if (!hasAnyApi && defaultData?.video) {
      setProject((p) => p ? { ...p, videos: [defaultData.video] } : p);
      alert('⚠️ 当前未配置 AI API，已展示默认示例视频。\n配置 API 后可生成专属视频。');
      return;
    }
    setGeneratingVideo(true);
    setVideoError('');
    try {
      const res  = await fetch('/api/generate-video', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.needPayment) {
          setVideoError(`已达免费次数上限，需支付 ¥${data.price}`);
        } else {
          setVideoError(data.error ?? '生成失败');
        }
      }
    } finally {
      setGeneratingVideo(false);
    }
  };

  // ── 分镜更新回调 ───────────────────────────────────────
  const handleStoryboardUpdated = (updated: StoryboardItem) => {
    setProject((p) =>
      p
        ? {
            ...p,
            storyboard_items: p.storyboard_items.map((s) =>
              s.id === updated.id ? updated : s
            ),
          }
        : p
    );
  };

  // ── 渲染 ──────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100">
      <div className="text-6xl animate-bounce mb-4">🎬</div>
      <p className="text-2xl text-purple-600 font-bold">加载中...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100 p-8">
      <div className="text-6xl mb-4">😢</div>
      <p className="text-2xl text-red-600 font-bold mb-6">{error}</p>
      <Link href="/" className="px-8 py-4 bg-purple-500 text-white rounded-3xl font-bold text-xl hover:bg-purple-600 transition-colors">← 返回首页</Link>
    </div>
  );

  if (!project) return null;

  const statusLabels: Record<string, string> = {
    drafting:         '📝 故事生成中',
    story_done:       '✅ 故事完成',
    storyboard_done:  '✅ 分镜图完成',
    video_done:       '🎬 视频完成',
    failed:           '❌ 失败',
  };

  const completedCount = project.storyboard_items.filter((s) => s.status === 'success').length;
  const allImagesDone  = completedCount === 9;
  const video          = project.videos?.[0];
  const canGenerateVideo = allImagesDone && !video?.url;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── 无 API 提示 ────────────────────────────── */}
        {hasAnyApi === false && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-2xl">
            <p className="text-yellow-800 font-bold text-center">
              尚未配置API，所有内容均展示默认示例数据
            </p>
          </div>
        )}

        {/* ── 顶部导航 ────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link href="/my-works" className="px-6 py-3 bg-white/60 backdrop-blur rounded-2xl font-bold text-purple-700 hover:bg-white transition-colors shadow">
            ← 我的作品
          </Link>
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-purple-700">
              {editingTitle || project.title || '创意动画项目'}
            </h1>
            <p className="text-purple-500 text-sm">
              👧 {project.child_name} · {STYLE_NAMES[project.style_id] ?? project.style_id}
            </p>
          </div>
          <span className="px-4 py-2 bg-white/60 backdrop-blur rounded-full text-sm font-bold text-purple-600 shadow">
            {statusLabels[project.status] ?? project.status}
          </span>
        </div>

        {/* ── 区域 1：故事区域 ──────────────────────────── */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
          {/* 作品名称（可编辑） */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-500 mb-1">作品名称</label>
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 text-2xl font-bold text-gray-800 focus:border-purple-500 focus:outline-none transition-colors"
            />
          </div>

          {/* 小朋友名字（只读） */}
          <div className="mb-4 flex items-center gap-2 text-gray-500 text-sm">
            <span>👧</span>
            <span className="font-bold">{project.child_name}</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">只读</span>
          </div>

          {/* 故事正文 */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-600 mb-1">故事正文</label>
            <textarea
              value={editingStory}
              onChange={(e) => setEditingStory(e.target.value)}
              rows={8}
              className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 text-base leading-relaxed focus:border-purple-500 focus:outline-none transition-colors resize-y"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveText}
              disabled={savingText}
              className="px-8 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {savingText ? '💾 保存中...' : '💾 保存'}
            </button>
            {saveErr && <span className="text-red-500 text-sm font-bold">❌ {saveErr}</span>}
          </div>
        </section>

        {/* ── 区域 2：角色设定 ──────────────────────────── */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            🦸 角色设定
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {([
              { key: 'name',    label: '角色名' },
              { key: 'species', label: '物种' },
              { key: 'color',  label: '主色' },
              { key: 'costume', label: '服装' },
              { key: 'prop',   label: '道具' },
            ] as const).map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
                <input
                  type="text"
                  value={(editingHero ?? {})[key] ?? ''}
                  onChange={(e) =>
                    setEditingHero((h) => h ? { ...h, [key]: e.target.value } : h)
                  }
                  className="w-full border-2 border-purple-200 rounded-xl px-3 py-2 text-sm focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>
            ))}
          </div>

          <button
            onClick={saveHero}
            disabled={savingHero}
            className="px-8 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {savingHero ? '💾 保存中...' : '💾 保存角色设定'}
          </button>
        </section>

        {/* ── 区域 3：九宫格 ─────────────────────────────── */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
              🎞️ 九宫格分镜
            </h2>
          <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-bold">
                {completedCount}/9 张
              </span>
              {/* ✅ 保留：一键出分镜图按钮 */}
              <button
                onClick={generateAllImages}
                className={`px-6 py-3 rounded-xl font-bold transition-colors ${
                  completedCount === 9
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                {completedCount === 9 ? '✅ 全部完成' : '🎨 一键出分镜图'}
              </button>
            </div>
          </div>

          {/* 3x3 网格 */}
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            {project.storyboard_items
              .slice(0, 9)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => (
                <StoryboardCard
                  key={item.id}
                  item={item}
                  styleId={project.style_id}
                  projectId={project.id}
                  onUpdated={handleStoryboardUpdated}
                />
              ))}
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            💡 点击已生成的分镜图可编辑 Prompt 并重新生成
          </p>
        </section>

        {/* ── 区域 4：动画视频 ───────────────────────────── */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2 mb-6">
              🎬 动画视频
            </h2>

          {/* 视频播放器 / 占位 */}
          <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
            {video?.status === 'processing' || generatingVideo ? (
              <div className="text-center">
                <div className="text-6xl animate-bounce mb-4">🎬</div>
                <p className="text-xl text-gray-600 font-bold">视频生成中，请稍候...</p>
                <p className="text-sm text-gray-400 mt-2">通常需要 2-5 分钟</p>
              </div>
            ) : video?.url ? (
              <video
                src={video.url}
                controls
                className="w-full h-full object-contain"
                poster={project.storyboard_items[0]?.image_url ?? undefined}
              />
            ) : (
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">🎬</div>
                <p className="text-lg font-bold">
                  {canGenerateVideo ? '九宫格生成完毕，可以生成视频啦！' : '请先生成九宫格分镜图'}
                </p>
                {videoError && (
                  <p className="text-red-500 mt-2 font-bold">{videoError}</p>
                )}
              </div>
            )}
          </div>

          {/* 免费次数提示 */}
          {!video && !generatingVideo && (
            <div className="mt-6 flex items-center justify-center gap-4">
              {/* ✅ 保留：生成视频按钮 */}
              <button
                onClick={generateVideo}
                disabled={!canGenerateVideo || generatingVideo}
                className={`px-8 py-3 rounded-2xl font-bold transition-colors ${
                  canGenerateVideo
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {generatingVideo ? '⏳ 生成中...' : '🎬 生成视频'}
              </button>
              <p className="text-xs text-gray-400">
                🎁 每项目免费生成 1 次视频，后续需支付 ¥9.9（本期仅预留接口）
              </p>
            </div>
          )}
          {video?.url && (
            <div className="mt-4 text-center">
              <a
                href={video.url}
                download={`${project.title ?? '动画'}.mp4`}
                className="px-8 py-3 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600 transition-colors"
              >
                ⬇️ 下载视频
              </a>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
