'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import KidButton from '@/components/KidButton';
import { formatDateTime } from '@/lib/utils';

interface Project {
  id: string;
  user_id: string;
  title: string;
  story: string;
  style: string;
  status: string;
  original_image_url: string;
  created_at: string;
  child_name?: string;
  images: Image[];
  videos: Video[];
}

interface Image {
  id: string;
  url: string;
  prompt: string;
  order_index: number;
  regeneration_count: number;
  scene_title?: string;
}

interface Video {
  id: string;
  url: string;
  prompt: string;
  generation_count: number;
  status: string;
}

const DEFAULT_STORY = `在一个充满魔法的小镇上，住着一个叫"小星星"的小朋友。小星星最喜欢画画了，每天都会用彩笔画出自己想象中的世界。

有一天，小星星画了一只会飞的猫咪！这只猫咪有着彩虹色的毛发，眼睛像两颗闪闪发光的宝石。当小星星对着画作许愿时，神奇的事情发生了——画中的猫咪竟然活了过来！

彩虹猫带着小星星飞上了天空，他们一起穿过了云朵城堡，拜访了月亮婆婆，还在星河里游了个泳。最后，彩虹猫告诉小星星："只要你保持想象力，我永远都会陪着你。"

从此以后，小星星的每一幅画都充满了魔法，而彩虹猫也成了小星星最好的朋友。`;

const DEFAULT_PROMPTS = [
  "一个可爱的小朋友坐在书桌前画画，房间温馨明亮，窗外阳光洒进来，Pixar 3D动画风格",
  "小朋友画了一只彩虹色的猫咪，猫咪从画纸上缓缓浮现，眼睛发光，魔法粒子环绕，Pixar风格",
  "彩虹猫完全从画中跳出来，小朋友惊讶又开心，房间被彩色光芒照亮，Pixar 3D风格",
  "彩虹猫载着小朋友飞出窗户，穿过云朵，背景是蓝天和彩虹，梦幻场景，Pixar风格",
  "云朵城堡出现在眼前，由柔软的白云构成，有门窗和塔楼，彩虹猫和小星星飞向城堡，Pixar风格",
  "在云朵城堡内部，到处是棉花糖做的家具，月亮婆婆慈祥地笑着迎接他们，温暖氛围，Pixar风格",
  "星河场景，璀璨的星星形成一条发光的河流，彩虹猫和小星星在星河中游泳，唯美梦幻，Pixar风格",
  "回到地面，小朋友躺在床上熟睡，彩虹猫趴在枕边守护，月光洒进房间，温馨宁静，Pixar风格",
  "小朋友醒来发现桌上多了一张画：自己和彩虹猫的合影，阳光洒进来，幸福微笑，Pixar 3D结局",
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // 编辑状态
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [editingStory, setEditingStory] = useState(false);
  const [storyInput, setStoryInput] = useState('');
  const [childName, setChildName] = useState('');

  // 新功能状态
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);

  // 加载项目详情
  useEffect(() => {
    if (projectId) loadProject();
  }, [projectId]);

  // 加载用户名字
  useEffect(() => {
    if (project?.user_id) {
      fetch(`/api/users/${project.user_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setChildName(data.data.name || '');
        })
        .catch(() => {});
    }
  }, [project?.user_id]);

  const loadProject = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.data.project);
      } else {
        alert('❌ 项目不存在');
        router.push('/my-works');
      }
    } catch (error) {
      console.error('加载项目出错:', error);
    } finally {
      setLoading(false);
    }
  };

  // 解析故事数据
  const getStoryData = () => {
    if (!project?.story) return { story: DEFAULT_STORY, prompts: DEFAULT_PROMPTS, hero_design: null, storyboard: [] };
    try {
      const parsed = JSON.parse(project.story);
      return {
        story: parsed.story || DEFAULT_STORY,
        prompts: parsed.prompts || DEFAULT_PROMPTS,
        hero_design: parsed.hero_design || null,
        storyboard: parsed.storyboard || [],
      };
    } catch {
      return { story: project.story || DEFAULT_STORY, prompts: DEFAULT_PROMPTS, hero_design: null, storyboard: [] };
    }
  };

  const storyData = getStoryData();

  // 保存标题
  const saveTitle = async () => {
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleInput }),
      });
      const data = await res.json();
      if (data.success) {
        setProject({ ...project, title: titleInput });
        setEditingTitle(false);
      } else {
        alert(`❌ 保存失败: ${data.error}`);
      }
    } catch (error) {
      alert('❌ 保存失败');
    }
  };

  // 保存故事
  const saveStory = async () => {
    if (!project) return;
    try {
      const newStoryJson = JSON.stringify({ story: storyInput, prompts: storyData.prompts, hero_design: storyData.hero_design, storyboard: storyData.storyboard });
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: newStoryJson }),
      });
      const data = await res.json();
      if (data.success) {
        setProject({ ...project, story: newStoryJson });
        setEditingStory(false);
      } else {
        alert(`❌ 保存失败: ${data.error}`);
      }
    } catch (error) {
      alert('❌ 保存失败');
    }
  };

  // 单图下载
  const handleDownloadImage = async (url: string, index: number) => {
    setDownloadingIndex(index);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `分镜${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert('下载失败');
    } finally {
      setDownloadingIndex(null);
    }
  };

  // 用自定义 Prompt 重新生成单张图
  const handleRegenImageWithPrompt = async (imageId: string, orderIndex: number) => {
    const newPrompt = promptInput.trim();
    if (!newPrompt) { alert('请输入 Prompt'); return; }
    try {
      const res = await fetch('/api/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project?.id, orderIndex, prompt: newPrompt }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ 重新生成中，请稍后刷新查看');
        setEditingPromptIndex(null);
        setPromptInput('');
        loadProject();
      } else {
        alert(`❌ ${data.error || '重新生成失败'}`);
      }
    } catch (e) {
      alert('❌ 重新生成失败');
    }
  };

  // 单张图片重新生成（用当前 prompt）
  const handleRegenImage = async (imageId: string, orderIndex: number) => {
    if (!project) return;
    const img = project.images.find(i => i.id === imageId);
    if (!img || (img.regeneration_count ?? 0) >= 1) {
      alert('❌ 该图片已达到最大重生次数（1次）');
      return;
    }
    setPromptInput(img.prompt || '');
    setEditingPromptIndex(orderIndex);
  };

  // 一键生成全部九宫格分镜图
  const handleGenerateAllImages = async () => {
    if (!project) return;
    setGeneratingImages(true);
    try {
      const res = await fetch('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, style: project.style }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ 分镜图生成中，请稍后刷新查看');
        loadProject();
      } else {
        alert(`❌ 生成失败：${data.error || '未知错误'}`);
      }
    } catch (e) {
      alert('❌ 生成失败，请检查 DOUBAO_API_KEY 是否已配置');
    } finally {
      setGeneratingImages(false);
    }
  };

  // 视频重新生成（有视频时调这个函数）
  const handleRegenVideo = async () => {
    if (!project?.videos?.[0]) return;
    if ((project.videos[0].generation_count ?? 0) >= 1) {
      alert('❌ 视频已达到最大重生次数（1次）');
      return;
    }
    await handleGenerateVideo();
  };

  // 生成视频（统一的底层函数）
  const handleGenerateVideo = async () => {
    if (!project) return;
    setGeneratingVideo(true);
    try {
      const imageUrls = (project.images || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((img: any) => img.url)
        .filter(Boolean);
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, imageUrls, style: project.style }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ 视频生成中，请稍后刷新查看');
        loadProject();
      } else {
        alert(`❌ 生成失败：${data.error || '未知错误'}`);
      }
    } catch (e) {
      alert('❌ 生成失败，请检查 DOUBAO_API_KEY 是否已配置');
    } finally {
      setGeneratingVideo(false);
    }
  };

  // 从 Lightbox 直接重新生成（用当前 prompt）
  const handleRegenImageDirectly = async (orderIndex: number) => {
    const image = project?.images?.find((i: any) => i.order_index === orderIndex);
    if (!image || (image.regeneration_count ?? 0) >= 1) {
      alert('该图片已达到最大重生次数（1次）');
      return;
    }
    try {
      const res = await fetch('/api/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project?.id, orderIndex, prompt: image.prompt }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ 重新生成中，请稍后刷新查看');
        setLightboxIndex(null);
        loadProject();
      } else {
        alert(`❌ ${data.error || '重新生成失败'}`);
      }
    } catch (e) {
      alert('❌ 重新生成失败');
    }
  };

  // 键盘关闭 lightbox
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100">
        <div className="text-6xl animate-bounce">⏳</div>
        <div className="text-3xl text-purple-600 ml-4">加载中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100">
        <div className="text-3xl text-red-600">❌ 项目不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <h1 className="text-3xl md:text-5xl font-bold text-center text-purple-600 mb-6 md:mb-12">
          🎬 我的动画作品
        </h1>

        <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-12">
          {/* ===== 作品标题（可编辑）===== */}
          <div className="mb-8 md:mb-12">
            {editingTitle ? (
              <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="text-xl md:text-3xl font-bold text-gray-800 border-3 border-purple-400 rounded-2xl px-4 md:px-6 py-2 md:py-3 flex-1 min-w-0"
                  placeholder="给作品起个名字吧"
                  onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                  autoFocus
                />
                <KidButton onClick={saveTitle} className="bg-green-500 text-white px-3 md:px-6 py-2 md:py-3 text-sm md:text-base">
                  ✅ 保存
                </KidButton>
                <KidButton onClick={() => setEditingTitle(false)} className="bg-gray-400 text-white px-3 md:px-6 py-2 md:py-3 text-sm md:text-base">
                  取消
                </KidButton>
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                <h2
                  className="text-2xl md:text-3xl font-bold text-gray-800 cursor-pointer hover:text-purple-600 transition-colors flex-1 min-w-0"
                  onClick={() => { setTitleInput(project.title || ''); setEditingTitle(true); }}
                >
                  ✏️ {project.title || '未命名作品（点击编辑）'}
                </h2>
                <span className="px-3 md:px-4 py-1 md:py-2 bg-purple-200 text-purple-800 rounded-full font-bold text-sm md:text-base whitespace-nowrap">
                  {getStyleName(project.style)}
                </span>
              </div>
            )}
            {/* 显示小朋友名字 */}
            {(childName && childName !== '小朋友') || (project as any)?.child_name ? (
              <p className="text-purple-600 font-bold text-base md:text-lg mt-2">
                👧 {childName || (project as any).child_name}
              </p>
            ) : null}
            <p className="text-gray-500 mt-2 text-sm md:text-base">
              创建于 {formatDateTime(project.created_at)}
            </p>
          </div>

          {/* ===== AI 故事大纲（可编辑）===== */}
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800">
                📖 AI 故事大纲
              </h3>
              {!editingStory && (
                <KidButton
                  onClick={() => { setStoryInput(storyData.story); setEditingStory(true); }}
                  className="bg-yellow-400 text-white px-3 md:px-4 py-1 md:py-2 text-sm md:text-base"
                >
                  ✏️ 编辑故事
                </KidButton>
              )}
            </div>

            {editingStory ? (
              <div>
                <textarea
                  value={storyInput}
                  onChange={(e) => setStoryInput(e.target.value)}
                  className="w-full h-48 md:h-64 border-3 border-yellow-400 rounded-2xl p-4 md:p-6 text-base md:text-lg leading-relaxed resize-none focus:outline-none focus:border-yellow-500"
                  placeholder="在这里编写你的故事..."
                  autoFocus
                />
                <div className="flex justify-end gap-2 md:gap-3 mt-3 md:mt-4">
                  <KidButton onClick={() => setEditingStory(false)} className="bg-gray-400 text-white px-4 md:px-6 py-1 md:py-2 text-sm md:text-base">
                    取消
                  </KidButton>
                  <KidButton onClick={saveStory} className="bg-green-500 text-white px-4 md:px-6 py-1 md:py-2 text-sm md:text-base">
                    ✅ 保存故事
                  </KidButton>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-2xl p-4 md:p-6 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                {storyData.story}
              </div>
            )}
          </div>

          {/* ===== 角色设定（显示 hero_design）===== */}
          {storyData.hero_design && (
            <div className="mb-8 md:mb-12 bg-purple-50 rounded-2xl p-4 md:p-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">
                🎭 角色设定
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-sm md:text-base">
                <div><span className="font-bold">名字：</span>{storyData.hero_design.name}</div>
                <div><span className="font-bold">物种：</span>{storyData.hero_design.species}</div>
                <div><span className="font-bold">颜色：</span>{storyData.hero_design.fur_color}</div>
                <div><span className="font-bold">服装：</span>{storyData.hero_design.clothes}</div>
                {storyData.hero_design.item && (
                  <div className="col-span-2 md:col-span-4"><span className="font-bold">道具：</span>{storyData.hero_design.item}</div>
                )}
              </div>
            </div>
          )}

          {/* ===== 九宫格分镜图（16:9）===== */}
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800">
                🎨 九宫格分镜
              </h3>
              <KidButton
                onClick={handleGenerateAllImages}
                disabled={generatingImages}
                className="bg-purple-500 hover:bg-purple-600 text-white px-3 md:px-4 py-1 md:py-2 text-sm md:text-base disabled:opacity-50"
              >
                {generatingImages ? '⏳ 生成中...' : '🎨 一键出分镜图'}
              </KidButton>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
                const image = project.images?.find(img => img.order_index === index);
                const hasImage = image && image.url;
                const prompt = storyData.prompts[index] || `分镜 ${index + 1}`;
                const sceneTitle = image?.scene_title || storyData.storyboard?.[index]?.title || `分镜 ${index + 1}`;

                return (
                  <div key={index} className="relative group">
                    {/* 图片或空位 - 16:9 比例 */}
                    {hasImage ? (
                      <>
                        <img
                          src={image.url}
                          alt={sceneTitle}
                          className="w-full aspect-video rounded-2xl shadow-lg object-cover cursor-pointer hover:scale-[1.02] transition-transform"
                          onClick={() => setLightboxIndex(index)}
                        />
                        {/* 悬浮操作按钮 */}
                        <div className="absolute top-1 right-1 md:top-2 md:right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRegenImage(image.id, index); }}
                            className="bg-orange-400 text-white rounded-full w-7 h-7 md:w-10 md:h-10 flex items-center justify-center text-sm md:text-lg shadow-lg"
                            title="重新生成这张图"
                          >
                            🔄
                          </button>
                        </div>
                      </>
                    ) : (
                      /* 空位占位 - 16:9 */
                      <div className="w-full aspect-video rounded-2xl bg-gray-100 border-3 border-dashed border-gray-300 flex flex-col items-center justify-center">
                        <div className="text-2xl md:text-4xl mb-1 opacity-30">🖼️</div>
                        <span className="text-xs md:text-sm text-gray-400">分镜 {index + 1}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== 动画视频 ===== */}
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800">
                🎬 动画视频
              </h3>
              {!(project.videos?.length > 0 && project.videos[0].url) && (
                <KidButton
                  onClick={handleGenerateVideo}
                  disabled={generatingVideo}
                  className="bg-orange-400 hover:bg-orange-500 text-white px-3 md:px-4 py-1 md:py-2 text-sm md:text-base disabled:opacity-50"
                >
                  {generatingVideo ? '⏳ 生成中...' : '🎬 生成视频'}
                </KidButton>
              )}
              {project.videos?.length > 0 && project.videos[0].url && (project.videos[0].generation_count ?? 0) < 1 && (
                <KidButton
                  onClick={handleRegenVideo}
                  disabled={generatingVideo}
                  className="bg-orange-400 hover:bg-orange-500 text-white px-3 md:px-4 py-1 md:py-2 text-sm md:text-base disabled:opacity-50"
                >
                  {generatingVideo ? '⏳ 生成中...' : '🔄 重新生成视频'}
                </KidButton>
              )}
            </div>

            {project.videos?.length > 0 && project.videos[0].url ? (
              <div className="relative">
                <video
                  src={project.videos[0].url}
                  controls
                  className="w-full rounded-2xl shadow-lg"
                />
                <div className="mt-3 md:mt-4 flex items-center justify-between">
                  <span className="text-gray-600 text-sm">
                    已生成 · 剩余重生机会：{1 - (project.videos[0].generation_count ?? 0)}
                  </span>
                  {(project.videos[0].generation_count ?? 0) < 1 && (
                    <KidButton onClick={handleRegenVideo} className="bg-orange-400 text-white px-3 md:px-4 py-1 md:py-2 text-sm md:text-base">
                      🔄 重新生成视频
                    </KidButton>
                  )}
                </div>
              </div>
            ) : (
              /* 空位占位 */
              <div className="w-full aspect-video rounded-2xl bg-gray-100 border-3 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <div className="text-4xl md:text-7xl mb-2 md:mb-3 opacity-30">🎬</div>
                <span className="text-base md:text-xl text-gray-400">动画视频位置</span>
                <span className="text-xs md:text-sm text-gray-300 mt-1 md:mt-2">等待 AI 生成</span>
              </div>
            )}
          </div>

          {/* ===== 操作按钮 ===== */}
          <div className="flex justify-center space-x-4 md:space-x-6">
            <KidButton
              onClick={() => router.push('/upload')}
              className="bg-gradient-to-r from-green-400 to-blue-400 text-white px-4 md:px-8 py-2 md:py-4 text-base md:text-xl"
            >
              🎨 创作新作品
            </KidButton>
            <KidButton
              onClick={() => router.push('/my-works')}
              className="bg-gray-400 text-white px-4 md:px-8 py-2 md:py-4 text-base md:text-xl"
            >
              📺 返回作品列表
            </KidButton>
          </div>
        </div>
      </div>

      {/* ===== Lightbox 放大查看 ===== */}
      {lightboxIndex !== null && project?.images?.[lightboxIndex] && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-2 md:p-8 cursor-pointer"
          onClick={() => setLightboxIndex(null)}
        >
          <img
            src={project.images[lightboxIndex].url}
            alt={`分镜 ${lightboxIndex + 1}`}
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {/* 关闭按钮 */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="fixed top-4 right-4 md:top-6 md:right-6 text-white text-3xl md:text-4xl z-50 hover:scale-110 transition-transform"
          >
            ✕
          </button>
          {/* 底部信息 + 操作按钮 */}
          <div className="fixed bottom-2 md:bottom-6 left-0 right-0 text-white text-center px-2 md:px-4 z-50">
            <p className="text-sm md:text-base font-bold mb-2">分镜 {lightboxIndex + 1}：{project.images[lightboxIndex]?.scene_title || ''}</p>
            <div className="flex justify-center gap-2 flex-wrap">
              <button
                onClick={() => handleDownloadImage(project.images[lightboxIndex].url, lightboxIndex)}
                className="bg-blue-500 text-white rounded-full px-3 py-1 text-xs md:text-sm hover:bg-blue-600 transition-colors"
                disabled={downloadingIndex === lightboxIndex}
              >
                {downloadingIndex === lightboxIndex ? '⏳' : '⬇️ 下载'}
              </button>
              <button
                onClick={() => {
                  setPromptInput(project.images[lightboxIndex]?.prompt || '');
                  setEditingPromptIndex(lightboxIndex);
                  setLightboxIndex(null);
                }}
                className="bg-purple-500 text-white rounded-full px-3 py-1 text-xs md:text-sm hover:bg-purple-600 transition-colors"
              >
                ✏️ 改Prompt
              </button>
              <button
                onClick={() => handleRegenImageDirectly(lightboxIndex)}
                className="bg-orange-500 text-white rounded-full px-3 py-1 text-xs md:text-sm hover:bg-orange-600 transition-colors"
                disabled={(project.images[lightboxIndex]?.regeneration_count ?? 0) >= 1}
              >
                🔄 重生成
              </button>
            </div>
          </div>
          {/* 左右切换 */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.max(0, lightboxIndex - 1)); }}
            className="fixed left-2 md:left-6 top-1/2 -translate-y-1/2 text-white text-3xl md:text-5xl z-50 hover:scale-110 transition-transform"
            disabled={lightboxIndex === 0}
          >
            ‹
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.min((project?.images?.length || 1) - 1, lightboxIndex + 1)); }}
            className="fixed right-2 md:right-6 top-1/2 -translate-y-1/2 text-white text-3xl md:text-5xl z-50 hover:scale-110 transition-transform"
            disabled={lightboxIndex === (project?.images?.length || 1) - 1}
          >
            ›
          </button>
        </div>
      )}

      {/* ===== Prompt 编辑弹窗 ===== */}
      {editingPromptIndex !== null && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setEditingPromptIndex(null)}
        >
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl md:text-2xl font-bold mb-4">
              ✏️ 编辑分镜 {editingPromptIndex + 1} 的 Prompt
            </h3>
            <textarea
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              className="w-full h-32 md:h-40 border-2 border-purple-300 rounded-2xl p-3 md:p-4 text-sm md:text-base focus:outline-none focus:border-purple-500 resize-none"
              placeholder="修改 Prompt 后重新生成这张图..."
              autoFocus
            />
            <div className="flex justify-end gap-2 md:gap-3 mt-3 md:mt-4">
              <KidButton onClick={() => setEditingPromptIndex(null)} className="bg-gray-400 text-white px-4 md:px-6 py-1 md:py-2 text-sm md:text-base">
                取消
              </KidButton>
              <KidButton
                onClick={() => {
                  const img = project?.images?.find((_, i) => i === editingPromptIndex);
                  if (img) handleRegenImageWithPrompt(img.id, editingPromptIndex);
                }}
                className="bg-purple-500 text-white px-4 md:px-6 py-1 md:py-2 text-sm md:text-base"
              >
                🔄 重新生成
              </KidButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStyleName(style: string): string {
  const styleMap: Record<string, string> = {
    pixar: '🎬 Pixar 3D',
    guofeng: '🏮 国风',
    anime: '🌸 二次元',
    watercolor: '🎨 水彩',
    cyberpunk: '🌃 赛博朋克',
  };
  return styleMap[style] || style;
}
