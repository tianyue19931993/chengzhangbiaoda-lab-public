'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import KidButton from '@/components/KidButton';

interface Project {
  id: string;
  child_name: string;
  project_name: string;
  style_id: string;
  original_image_url?: string;
  storyboard_image_url?: string;
  video_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
  style_name?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending:    '⏳ 等待处理',
  processing: '⚙️ 处理中',
  completed:  '✅ 已完成',
  failed:     '❌ 失败',
};

const STYLE_NAMES: Record<string, string> = {
  pixar: '🎬 Pixar 3D',
  chinese: '🏮 国风',
  anime: '🌸 二次元',
  watercolor: '🎨 水彩',
  cyberpunk: '🌃 赛博朋克',
};

// 九宫格占位图
const STORYBOARD_PLACEHOLDER = (
  <div className="w-full max-h-80 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-dashed border-purple-200 flex flex-col items-center justify-center mx-auto">
    <div className="text-6xl mb-3">🎬</div>
    <p className="text-lg text-purple-400 font-bold">九宫格分镜图</p>
    <p className="text-sm text-gray-400 mt-1">正在制作中...</p>
  </div>
);

// 视频占位符
const VIDEO_PLACEHOLDER = (
  <div className="w-full max-h-80 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 border-4 border-dashed border-orange-200 flex flex-col items-center justify-center mx-auto">
    <div className="text-6xl mb-3">🎥</div>
    <p className="text-lg text-orange-400 font-bold">动画视频</p>
    <p className="text-sm text-gray-400 mt-1">正在制作中...</p>
  </div>
);

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState('');

  useEffect(() => { params.then(({ id }) => setProjectId(id)); }, [params]);

  useEffect(() => {
    if (!projectId) return;
    fetch('/api/projects/' + projectId)
      .then(r => r.json())
      .then(data => {
        if (data.success) setProject(data.data.project);
        else setError(data.error ?? '未知错误');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

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
      <Link href="/my-works" className="px-8 py-4 bg-purple-500 text-white rounded-3xl font-bold text-xl hover:bg-purple-600">← 返回</Link>
    </div>
  );

  if (!project) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* 头部信息卡片 */}
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <Link href="/my-works" className="px-5 py-2.5 bg-white/70 backdrop-blur rounded-xl font-bold text-purple-700 hover:bg-white transition-colors shadow text-sm md:text-base">
              ← 我的作品
            </Link>
            <span className={`px-4 py-2 rounded-full text-sm font-bold shadow ${
              project.status === 'completed' ? 'bg-green-100 text-green-700' :
              project.status === 'processing' ? 'bg-blue-100 text-blue-700' :
              project.status === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {STATUS_LABELS[project.status] ?? project.status}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-purple-700 text-center">{project.project_name || '未命名作品'}</h1>
          <p className="text-purple-500 text-sm text-center mt-2">
            👦 {project.child_name} · {STYLE_NAMES[project.style_id] ?? project.style_id}
          </p>
          <p className="text-gray-400 text-xs text-center mt-1">
            创建时间：{new Date(project.created_at).toLocaleString('zh-CN')}
          </p>
        </div>

        {/* 原创画作 */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📷 我的创意画</h2>
          {project.original_image_url ? (
            <img src={project.original_image_url} alt="原创画作" className="max-w-full rounded-2xl shadow-lg mx-auto" />
          ) : (
            <div className="w-full h-48 rounded-2xl bg-gray-100 flex items-center justify-center">
              <p className="text-gray-400">暂无图片</p>
            </div>
          )}
        </section>

        {/* 九宫格分镜图（有则展示，无则占位） */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🎬 九宫格分镜</h2>
          {project.storyboard_image_url ? (
            <img src={project.storyboard_image_url} alt="九宫格分镜" className="max-w-full rounded-2xl shadow-lg mx-auto" />
          ) : (
            STORYBOARD_PLACEHOLDER
          )}
        </section>

        {/* 动画视频（有则展示，无则占位） */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🎥 动画视频</h2>
          {project.video_url ? (
            <video src={project.video_url} controls className="w-full rounded-2xl shadow-lg mx-auto" />
          ) : (
            VIDEO_PLACEHOLDER
          )}
        </section>

        {/* 返回按钮 */}
        <div className="text-center pb-8">
          <Link href="/my-works">
            <KidButton className="bg-gray-400 text-white text-sm px-4 py-2 md:px-6 md:py-3">← 返回我的作品</KidButton>
          </Link>
        </div>

      </div>
    </div>
  );
}
