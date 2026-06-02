'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

export default function TeacherPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => { loadAllProjects(); }, []);

  const loadAllProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/teacher/projects');
      const data = await res.json();
      if (data.success) setProjects(data.data.projects);
      else setError(data.error ?? '加载失败');
    } catch (e: any) {
      setError(e.message ?? '网络错误');
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-100 to-red-100">
      <div className="text-6xl animate-bounce mb-4">⏳</div>
      <p className="text-2xl text-orange-600 font-bold">加载中...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 to-red-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* 标题 */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-orange-600">
            👨‍🏫 老师端 - 全量作品
          </h1>
          <Link href="/" className="px-6 py-3 bg-white/60 backdrop-blur rounded-2xl font-bold text-orange-700 hover:bg-white transition-colors shadow">
            返回首页
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-2xl mb-6">
            <p className="text-red-800 font-bold">❌ {error}</p>
          </div>
        )}

        {/* 统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: '总作品数', value: projects.length, color: 'from-blue-400 to-blue-600' },
            { label: '故事完成', value: projects.filter(p => p.status === 'story_done').length, color: 'from-green-400 to-green-600' },
            { label: '分镜完成', value: projects.filter(p => p.status === 'storyboard_done').length, color: 'from-purple-400 to-purple-600' },
            { label: '视频完成', value: projects.filter(p => p.status === 'video_done').length, color: 'from-orange-400 to-orange-600' },
            { label: '失败', value: projects.filter(p => p.status === 'failed').length, color: 'from-red-400 to-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-gradient-to-r ${color} rounded-2xl p-4 text-white shadow-lg`}>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm opacity-90">{label}</p>
            </div>
          ))}
        </div>

        {/* 作品列表 */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
            <div className="text-6xl md:text-8xl mb-4">📭</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">还没有作品</h2>
            <p className="text-lg text-gray-600">等待小朋友们上传第一幅作品吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {projects.map((p) => {
              const cover = coverImage(p);
              const info  = STATUS_MAP[p.status] ?? { text: p.status, color: 'bg-gray-100 text-gray-600' };
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="block">
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer">
                    <div className="h-36 md:h-48 bg-gradient-to-r from-orange-200 to-red-200 flex items-center justify-center overflow-hidden">
                      {cover ? (
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-7xl opacity-40">🎨</div>
                      )}
                    </div>
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
                        <span className="text-orange-600 text-sm font-bold">
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

        {/* 刷新按钮 */}
        <div className="mt-8 text-center">
          <button
            onClick={loadAllProjects}
            className="px-8 py-3 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-colors shadow-lg"
          >
            🔄 刷新作品列表
          </button>
        </div>
      </div>
    </div>
  );
}
