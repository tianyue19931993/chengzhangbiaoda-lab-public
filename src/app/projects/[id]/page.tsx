'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import KidButton from '@/components/KidButton';

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

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  
  // 加载项目详情
  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);
  
  const loadProject = async () => {
    setLoading(true);
    
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      
      if (data.success) {
        setProject(data.data.project);
      } else {
        console.error('加载项目失败:', data.error);
        alert('❌ 项目不存在');
        router.push('/my-works');
      }
    } catch (error) {
      console.error('加载项目出错:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 生成九宫格
  const handleGenerateImages = async () => {
    if (!project) return;
    
    setGeneratingImages(true);
    
    try {
      // 解析 story 中的 prompts
      const storyData = JSON.parse(project.story);
      const prompts = storyData.prompts || [];
      
      if (prompts.length === 0) {
        alert('❌ 未找到提示词');
        return;
      }
      
      const res = await fetch('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          prompts,
          style: project.style,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('✅ 九宫格生成中，请稍后刷新查看！');
        setTimeout(() => loadProject(), 3000);
      } else {
        alert(`❌ 生成失败: ${data.error}`);
      }
    } catch (error: any) {
      console.error('生成图片出错:', error);
      alert(`❌ 生成失败: ${error.message}`);
    } finally {
      setGeneratingImages(false);
    }
  };
  
  // 生成视频
  const handleGenerateVideo = async () => {
    if (!project || !project.images || project.images.length === 0) {
      alert('❌ 请先生成九宫格图片！');
      return;
    }
    
    setGeneratingVideo(true);
    
    try {
      const imageUrls = project.images.map(img => img.url);
      const storyData = JSON.parse(project.story);
      
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          imageUrls,
          prompt: storyData.story || 'A cute story',
          style: project.style,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('✅ 视频生成中，请稍后刷新查看！');
        setTimeout(() => loadProject(), 5000);
      } else if (data.error === '需要付费') {
        const confirm = window.confirm(
          `生成视频需要付费 ¥${data.data.price}，是否继续？`
        );
        if (confirm) {
          // TODO: 实现支付逻辑
          alert('💰 支付功能开发中...');
        }
      } else {
        alert(`❌ 生成失败: ${data.error}`);
      }
    } catch (error: any) {
      console.error('生成视频出错:', error);
      alert(`❌ 生成失败: ${error.message}`);
    } finally {
      setGeneratingVideo(false);
    }
  };
  
  // 下载文件
  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
  
  const storyData = JSON.parse(project.story || '{}');
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <h1 className="text-5xl font-bold text-center text-purple-600 mb-12">
          🎬 我的动画作品
        </h1>
        
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* 项目信息 */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              {project.title || '未命名作品'}
            </h2>
            <div className="flex items-center space-x-4">
              <span className="px-4 py-2 bg-purple-200 text-purple-800 rounded-full font-bold">
                {getStyleName(project.style)}
              </span>
              <span className="text-gray-500">
                创建于 {new Date(project.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
          
          {/* 原始图片 */}
          {project.original_image_url && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                📸 我的创意画
              </h3>
              <img
                src={project.original_image_url}
                alt="创意画"
                className="max-w-full max-h-96 rounded-2xl shadow-lg"
              />
            </div>
          )}
          
          {/* AI 生成的故事 */}
          {storyData.story && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                📖 AI 生成的故事
              </h3>
              <div className="bg-yellow-50 rounded-2xl p-6 text-lg leading-relaxed">
                {storyData.story}
              </div>
            </div>
          )}
          
          {/* 九宫格图片 */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                🎨 九宫格分镜
              </h3>
              <KidButton
                onClick={handleGenerateImages}
                disabled={generatingImages || !storyData.prompts}
                className="bg-gradient-to-r from-green-400 to-blue-400 text-white"
              >
                {generatingImages ? '⏳ 生成中...' : '🎨 生成九宫格'}
              </KidButton>
            </div>
            
            {project.images && project.images.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {project.images.map((image, index) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.url}
                      alt={`分镜 ${index + 1}`}
                      className="w-full rounded-2xl shadow-lg"
                    />
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDownload(image.url, `image-${index + 1}.png`)}
                        className="bg-white rounded-full p-2 shadow-lg"
                      >
                        📥
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      重生次数: {image.regeneration_count}/1（免费）
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-6xl mb-4">🎨</div>
                <p>点击"生成九宫格"按钮，让 AI 帮你生成分镜图！</p>
              </div>
            )}
          </div>
          
          {/* 视频 */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                🎬 动画视频
              </h3>
              <KidButton
                onClick={handleGenerateVideo}
                disabled={generatingVideo || !project.images || project.images.length === 0}
                className="bg-gradient-to-r from-red-400 to-pink-400 text-white"
              >
                {generatingVideo ? '⏳ 生成中...' : '🎬 生成视频'}
              </KidButton>
            </div>
            
            {project.videos && project.videos.length > 0 && project.videos[0].url ? (
              <div className="relative">
                <video
                  src={project.videos[0].url}
                  controls
                  className="w-full rounded-2xl shadow-lg"
                />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-gray-600">
                    生成次数: {project.videos[0].generation_count}/3
                  </span>
                  <button
                    onClick={() => handleDownload(project.videos[0].url, 'video.mp4')}
                    className="bg-blue-500 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-600"
                  >
                    📥 下载视频
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-6xl mb-4">🎬</div>
                <p>先生成九宫格，然后点击"生成视频"按钮！</p>
              </div>
            )}
          </div>
          
          {/* 操作按钮 */}
          <div className="flex justify-center space-x-6">
            <KidButton
              onClick={() => router.push('/upload')}
              className="bg-gradient-to-r from-green-400 to-blue-400 text-white"
            >
              🎨 创作新作品
            </KidButton>
            
            <KidButton
              onClick={() => router.push('/my-works')}
              className="bg-gray-400 text-white"
            >
              📺 返回作品列表
            </KidButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// 获取风格名称
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
