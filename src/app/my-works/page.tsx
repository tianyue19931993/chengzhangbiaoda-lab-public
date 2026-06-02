'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import KidButton from '@/components/KidButton';
import { formatDate } from '@/lib/utils';

interface StoryboardItem { id: string; image_url: string | null; sort_order: number; }
interface Video         { id: string; url: string | null; status: string; }
interface Project {
  id: string;
  child_name:       string;
  style_id:         string;
  title:            string;
  status:           string;
  created_at:       string;
  uploaded_image:   string;
  storyboard_items: StoryboardItem[];
  videos:          Video[];
}

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  drafting:        { text: '📝 故事生成中',   color: 'bg-yellow-100 text-yellow-700' },
  story_done:      { text: '✅ 故事完成',     color: 'bg-blue-100 text-blue-700' },
  storyboard_done: { text: '🎨 分镜完成',     color: 'bg-purple-100 text-purple-700' },
  video_done:      { text: '🎬 视频完成',     color: 'bg-green-100 text-green-700' },
  failed:          { text: '❌ 失败',          color: 'bg-red-100 text-red-700' },
};

const STYLE_NAMES: Record<string, string> = {
  pixar:     '🎬 Pixar 3D',
  chinese:   '🏮 国风',
  anime:     '🌸 二次元',
  watercolor:'🎨 水彩',
  cyberpunk: '🌃 赛博朋克',
};

export default function MyWorksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      // TODO: 接入登录系统后替换为真实 userId
      const userId = 'demo-user';
      const res  = await fetch(`/api/projects?userId=${userId}`);
      const data = await res.json();
      if (data.success) setProjects(data.data.projects);
    } catch (e) {
      console.error('加载失败', e);
    } finally {
      setLoading(false);
    }
  };

  const coverImage = (p: Project) => {
    const done = p.storyboard_items?.find((s) => s.image_url);
    if (done) return done.image_url;
    if (p.uploaded_image) return p.uploaded_image;
    return null;
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100">
      <div className="text-6xl animate-bounce mb-4">⏳</div>
      <p className="text-2xl text-purple-600 font-bold">加载中...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* 标题 */}
        <h1 className="text-3xl md:text-5xl font-bold text-center text-purple-600 mb-8 md:mb-12">
          📺 我的作品
        </h1>

        {/* 空状态 */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
            <div className="text-6xl md:text-8xl mb-4">🎨</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">还没有作品</h2>
            <p className="text-lg text-gray-600 mb-8">上传你的第一张创意画，开始创作吧！</p>
            <Link href="/upload">
              <KidButton className="bg-gradient-to-r from-pink-400 to-purple-400 text-white text-xl">
                🚀 开始创作
              </KidButton>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {projects.map((p) => {
              const cover = coverImage(p);
              const info  = STATUS_MAP[p.status] ?? { text: p.status, color: 'bg-gray-100 text-gray-600' };
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="block">
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer">
                    {/* 封面 */}
                    <div className="h-36 md:h-48 bg-gradient-to-r from-purple-200 to-pink-200 flex items-center justify-center overflow-hidden">
                      {cover ? (
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-7xl opacity-40">🎨</div>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="p-4 md:p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">
                        {p.title || '未命名作品'}
                      </h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${info.color}`}>
                          {info.text}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {STYLE_NAMES[p.style_id] ?? p.style_id}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-purple-600 text-sm font-bold">
                          👧 {p.child_name}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {formatDate(p.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 返回 */}
        <div className="mt-8 md:mt-12 text-center">
          <Link href="/">
            <KidButton className="bg-gray-400 text-white text-sm px-4 py-2 md:px-6 md:py-3">
              ← 返回首页
            </KidButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
