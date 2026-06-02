'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import KidButton from '@/components/KidButton';
import { formatDateTime } from '@/lib/utils';

interface Project {
  id: string;
  title: string;
  story: string;
  style: string;
  status: string;
  original_image_url: string;
  created_at: string;
  images: Image[];
  videos: Video[];
}

interface Image {
  id: string;
  url: string;
  prompt: string;
  order_index: number;
  regeneration_count: number;
}

interface Video {
  id: string;
  url: string;
  prompt: string;
  generation_count: number;
  status: string;
}

// 默认故事大纲（豆包API未接入时使用）
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
    if (!project?.story) return { story: DEFAULT_STORY, prompts: DEFAULT_PROMPTS };
    try {
      const parsed = JSON.parse(project.story);
      return {
        story: parsed.story || DEFAULT_STORY,
        prompts: parsed.prompts || DEFAULT_PROMPTS,
      };
    } catch {
      return { story: project.story || DEFAULT_STORY, prompts: DEFAULT_PROMPTS };
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
      const newStoryJson = JSON.stringify({ story: storyInput, prompts: DEFAULT_PROMPTS });
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

  // 单张图片重新生成
  const handleRegenImage = async (imageId: string, orderIndex: number) => {
    if (!project) return;
    const img = project.images.find(i => i.id === imageId);
    if (!img || img.regeneration_count >= 1) {
      alert('❌ 该图片已达到最大重生次数（1次）');
      return;
    }
    
    // TODO: 接入即梦API后实现真正的重新生成
    alert('🎨 图片重新生成功能待AI服务接入后启用！');
  };

  // 视频重新生成
  const handleRegenVideo = () => {
    if (!project?.videos?.[0]) return;
    if (project.videos[0].generation_count >= 1) {
      alert('❌ 视频已达到最大重生次数（1次）');
      return;
    }
    alert('🎬 视频重新生成功能待AI服务接入后启用！');
  };

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
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <h1 className="text-5xl font-bold text-center text-purple-600 mb-12">
          🎬 我的动画作品
        </h1>

        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* ===== 作品标题（可编辑）===== */}
          <div className="mb-12">
            {editingTitle ? (
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="text-3xl font-bold text-gray-800 border-3 border-purple-400 rounded-2xl px-6 py-3 flex-1"
                  placeholder="给作品起个名字吧"
                  onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                  autoFocus
                />
                <KidButton onClick={saveTitle} className="bg-green-500 text-white px-6 py-3">
                  ✅ 保存
                </KidButton>
                <KidButton onClick={() => setEditingTitle(false)} className="bg-gray-400 text-white px-6 py-3">
                  取消
                </KidButton>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <h2
                  className="text-3xl font-bold text-gray-800 cursor-pointer hover:text-purple-600 transition-colors flex-1"
                  onClick={() => { setTitleInput(project.title || ''); setEditingTitle(true); }}
                >
                  ✏️ {project.title || '未命名作品（点击编辑）'}
                </h2>
                <span className="px-4 py-2 bg-purple-200 text-purple-800 rounded-full font-bold">
                  {getStyleName(project.style)}
                </span>
              </div>
            )}
            {/* 显示小朋友名字 */}
            {childName && childName !== '小朋友' && (
              <p className="text-purple-600 font-bold text-lg mt-2">
                👧 {childName}
              </p>
            )}
            <p className="text-gray-500 mt-2">
              创建于 {formatDateTime(project.created_at)}
            </p>
          </div>

          {/* ===== AI 故事大纲（可编辑）===== */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-800">
                📖 AI 故事大纲
              </h3>
              {!editingStory && (
                <KidButton
                  onClick={() => { setStoryInput(storyData.story); setEditingStory(true); }}
                  className="bg-yellow-400 text-white px-4 py-2"
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
                  className="w-full h-64 border-3 border-yellow-400 rounded-2xl p-6 text-lg leading-relaxed resize-none focus:outline-none focus:border-yellow-500"
                  placeholder="在这里编写你的故事..."
                  autoFocus
                />
                <div className="flex justify-end gap-3 mt-4">
                  <KidButton onClick={() => setEditingStory(false)} className="bg-gray-400 text-white px-6 py-2">
                    取消
                  </KidButton>
                  <KidButton onClick={saveStory} className="bg-green-500 text-white px-6 py-2">
                    ✅ 保存故事
                  </KidButton>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-2xl p-6 text-lg leading-relaxed whitespace-pre-wrap">
                {storyData.story}
              </div>
            )}
          </div>

          {/* ===== 九宫格分镜图 ===== */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              🎨 九宫格分镜
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
                const image = project.images?.find(img => img.order_index === index);
                const hasImage = image && image.url;
                
                return (
                  <div key={index} className="relative group">
                    {/* 图片或空位 */}
                    {hasImage ? (
                      <>
                        <img
                          src={image.url}
                          alt={`分镜 ${index + 1}`}
                          className="w-full aspect-square rounded-2xl shadow-lg object-cover"
                        />
                        {/* 重生按钮 */}
                        {(image.regeneration_count ?? 0) < 1 && (
                          <button
                            onClick={() => handleRegenImage(image.id, index)}
                            className="absolute top-2 right-2 bg-orange-400 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            title="重新生成这张图"
                          >
                            🔄
                          </button>
                        )}
                      </>
                    ) : (
                      /* 空位占符 */
                      <div className="w-full aspect-square rounded-2xl bg-gray-100 border-3 border-dashed border-gray-300 flex flex-col items-center justify-center">
                        <div className="text-5xl mb-2 opacity-30">🖼️</div>
                        <span className="text-sm text-gray-400">分镜 {index + 1}</span>
                        <span className="text-xs text-gray-300 mt-1">待生成</span>
                      </div>
                    )}

                    {/* 底部状态栏 */}
                    <div className="mt-2 text-center text-xs text-gray-500">
                      {hasImage ? (
                        <span>已生成 · 剩余重生机会：{1 - (image.regeneration_count ?? 0)}</span>
                      ) : (
                        <span>等待 AI 生成</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== 动画视频 ===== */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              🎬 动画视频
            </h3>

            {project.videos?.length > 0 && project.videos[0].url ? (
              <div className="relative">
                <video
                  src={project.videos[0].url}
                  controls
                  className="w-full rounded-2xl shadow-lg"
                />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-gray-600 text-sm">
                    已生成 · 剩余重生机会：{1 - project.videos[0].generation_count}
                  </span>
                  {(project.videos[0].generation_count ?? 0) < 1 && (
                    <KidButton onClick={handleRegenVideo} className="bg-orange-400 text-white px-4 py-2">
                      🔄 重新生成视频
                    </KidButton>
                  )}
                </div>
              </div>
            ) : (
              /* 空位占符 */
              <div className="w-full aspect-video rounded-2xl bg-gray-100 border-3 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <div className="text-7xl mb-3 opacity-30">🎬</div>
                <span className="text-xl text-gray-400">动画视频位置</span>
                <span className="text-sm text-gray-300 mt-2">等待 AI 生成</span>
              </div>
            )}
          </div>

          {/* ===== 操作按钮 ===== */}
          <div className="flex justify-center space-x-6">
            <KidButton
              onClick={() => router.push('/upload')}
              className="bg-gradient-to-r from-green-400 to-blue-400 text-white px-8 py-4 text-xl"
            >
              🎨 创作新作品
            </KidButton>
            <KidButton
              onClick={() => router.push('/my-works')}
              className="bg-gray-400 text-white px-8 py-4 text-xl"
            >
              📺 返回作品列表
            </KidButton>
          </div>
        </div>
      </div>
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
