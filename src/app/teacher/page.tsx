'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface Project {
  id: string;
  child_name: string;
  project_name: string;
  style_id: string;
  status: string;
  created_at: string;
  original_image_url?: string;
  storyboard_image_url?: string;
  video_url?: string;
  style_name?: string;
}

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending:    { text: '⏳ 等待处理',     color: 'bg-yellow-100 text-yellow-700' },
  processing: { text: '⚙️ 处理中',       color: 'bg-blue-100 text-blue-700' },
  completed:  { text: '✅ 已完成',        color: 'bg-green-100 text-green-700' },
  failed:     { text: '❌ 失败',          color: 'bg-red-100 text-red-700' },
};

export default function TeacherPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [nameSearch, setNameSearch] = useState('');

  useEffect(() => { loadAllProjects(); }, []);

  const loadAllProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/teacher/projects');
      const data = await res.json();
      if (data.success) setProjects(data.data.projects);
      else setError(data.error ?? '加载失败');
    } catch (e: any) {
      setError(e.message ?? '网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 筛选逻辑
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (nameSearch && !p.child_name.toLowerCase().includes(nameSearch.toLowerCase())) return false;
      return true;
    });
  }, [projects, statusFilter, nameSearch]);

  // 统计
  const stats = useMemo(() => ({
    all: projects.length,
    pending: projects.filter(p => p.status === 'pending').length,
    processing: projects.filter(p => p.status === 'processing').length,
    completed: projects.filter(p => p.status === 'completed').length,
  }), [projects]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-100 to-red-100">
      <div className="text-6xl animate-bounce mb-4">⏳</div>
      <p className="text-2xl text-orange-600 font-bold">加载中...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 to-red-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-orange-600">👨‍🏫 老师工作台</h1>
          <Link href="/" className="px-6 py-3 bg-white/60 backdrop-blur rounded-2xl font-bold text-orange-700 hover:bg-white transition-colors shadow">← 返回首页</Link>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-2xl mb-6">
            <p className="text-red-800 font-bold">{error}</p>
          </div>
        )}

        {/* 统计卡片 - 可点击筛选 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { key: '', label: '全部', value: stats.all, color: 'from-blue-400 to-blue-600' },
            { key: 'pending', label: '待处理', value: stats.pending, color: 'from-yellow-400 to-yellow-600' },
            { key: 'processing', label: '处理中', value: stats.processing, color: 'from-blue-400 to-indigo-600' },
            { key: 'completed', label: '已完成', value: stats.completed, color: 'from-green-400 to-green-600' },
          ].map(({ key, label, value, color }) => (
            <div key={key}
              onClick={() => setStatusFilter(key)}
              className={'bg-gradient-to-r ' + color + ' rounded-2xl p-4 text-white shadow-lg cursor-pointer transition-all hover:scale-105 ' +
                (statusFilter === key ? 'ring-4 ring-white scale-105' : '')}>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm opacity-90">{label}</p>
            </div>
          ))}
        </div>

        {/* 搜索栏 */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 flex gap-3 items-center">
          <span className="text-xl">🔍</span>
          <input
            type="text"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="输入学生名字搜索..."
            className="flex-1 text-lg outline-none placeholder-gray-400"
          />
          {(statusFilter || nameSearch) && (
            <button onClick={() => { setStatusFilter(''); setNameSearch(''); }}
              className="px-4 py-2 bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 text-sm font-bold">
              ✕ 清除筛选
            </button>
          )}
        </div>

        {/* 筛选结果提示 */}
        {(statusFilter || nameSearch) && (
          <div className="text-sm text-gray-600 mb-4">
            筛选结果：{filteredProjects.length} 个项目
            {statusFilter && <span className="ml-2 px-2 py-0.5 bg-orange-100 rounded-full text-orange-700">{STATUS_MAP[statusFilter]?.text}</span>}
            {nameSearch && <span className="ml-2 px-2 py-0.5 bg-orange-100 rounded-full text-orange-700">"{nameSearch}"</span>}
          </div>
        )}

        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
            <div className="text-6xl md:text-8xl mb-4">{projects.length === 0 ? '📭' : '🔍'}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              {projects.length === 0 ? '暂无提交作品' : '没有匹配的项目'}
            </h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredProjects.map((p) => {
              const info = STATUS_MAP[p.status] ?? { text: p.status, color: 'bg-gray-100 text-gray-600' };
              return (
                <Link key={p.id} href={`/teacher/projects/${p.id}`} className="block">
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer">
                    <div className="h-36 md:h-48 bg-gradient-to-r from-orange-200 to-red-200 flex items-center justify-center overflow-hidden">
                      {p.original_image_url ? (
                        <img src={p.original_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-7xl opacity-40">🎨</div>
                      )}
                    </div>
                    <div className="p-4 md:p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{p.project_name || '未命名'}</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${info.color}`}>{info.text}</span>
                        <span className="text-gray-400 text-xs">{p.style_name ?? p.style_id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-orange-600 text-sm font-bold">👦 {p.child_name}</span>
                        <span className="text-gray-400 text-xs">{formatDate(p.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <button onClick={loadAllProjects} className="px-8 py-3 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 shadow-lg">🔄 刷新</button>
        </div>
      </div>
    </div>
  );
}
