'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import KidButton from '@/components/KidButton';

interface Project {
  id: string;
  title: string;
  style: string;
  status: string;
  original_image_url: string;
  created_at: string;
  images: any[];
  videos: any[];
}

export default function MyWorksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 加载项目列表
  useEffect(() => {
    loadProjects();
  }, []);
  
  const loadProjects = async () => {
    setLoading(true);
    
    try {
      // 模拟用户 ID（实际应该从登录系统获取）
      const userId = 'demo-user';
      
      const res = await fetch(`/api/projects?userId=${userId}`);
      const data = await res.json();
      
      if (data.success) {
        setProjects(data.data.projects);
      } else {
        console.error('加载项目失败:', data.error);
      }
    } catch (error) {
      console.error('加载项目出错:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 获取状态显示
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      uploading: { text: '上传中', color: 'bg-blue-200 text-blue-800' },
      understanding: { text: 'AI 理解中', color: 'bg-yellow-200 text-yellow-800' },
      story_generated: { text: '故事已生成', color: 'bg-green-200 text-green-800' },
      generating_images: { text: '生成图片中', color: 'bg-purple-200 text-purple-800' },
      images_generated: { text: '图片已生成', color: 'bg-pink-200 text-pink-800' },
      generating_video: { text: '生成视频中', color: 'bg-indigo-200 text-indigo-800' },
      completed: { text: '✅ 已完成', color: 'bg-green-300 text-green-900' },
      failed: { text: '❌ 失败', color: 'bg-red-200 text-red-800' },
    };
    
    const statusInfo = statusMap[status] || { text: status, color: 'bg-gray-200' };
    
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-bold ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };
  
  // 获取风格名称
  const getStyleName = (style: string) => {
    const styleMap: Record<string, string> = {
      pixar: '🎬 Pixar 3D',
      guofeng: '🏮 国风',
      anime: '🌸 二次元',
      watercolor: '🎨 水彩',
      cyberpunk: '🌃 赛博朋克',
    };
    
    return styleMap[style] || style;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100">
        <div className="text-6xl animate-bounce">⏳</div>
        <div className="text-3xl text-purple-600 ml-4">加载中...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <h1 className="text-5xl font-bold text-center text-purple-600 mb-12">
          📺 我的作品
        </h1>
        
        {/* 作品列表 */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="text-8xl mb-6">🎨</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              还没有作品
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              上传你的第一张创意画，开始创作吧！
            </p>
            <Link href="/upload">
              <KidButton className="bg-gradient-to-r from-pink-400 to-purple-400 text-white text-2xl">
                🚀 开始创作
              </KidButton>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block"
              >
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow cursor-pointer">
                  {/* 项目图片 */}
                  <div className="h-48 bg-gradient-to-r from-purple-200 to-pink-200 flex items-center justify-center">
                    {project.images && project.images.length > 0 ? (
                      <img
                        src={project.images[0].url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-8xl opacity-50">🎨</div>
                    )}
                  </div>
                  
                  {/* 项目信息 */}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {project.title || '未命名作品'}
                    </h3>
                    
                    <div className="flex items-center justify-between mb-4">
                      {getStatusBadge(project.status)}
                      <span className="text-gray-500">
                        {getStyleName(project.style)}
                      </span>
                    </div>
                    
                    <div className="text-gray-400 text-sm">
                        创建时间: {new Date(project.created_at).toLocaleDateString('zh-CN')}
                      </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        
        {/* 返回按钮 */}
        <div className="mt-12 text-center">
          <Link href="/">
            <KidButton className="bg-gray-400 text-white">
              ← 返回首页
            </KidButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
