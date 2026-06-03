'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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

const STYLE_NAMES: Record<string, string> = {
  pixar: 'Pixar3D',
  chinese: '国风',
  anime: '二次元',
  watercolor: '水彩',
  cyberpunk: '赛博朋克',
};

// 下载单个文件
async function downloadUrl(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  return { blob, filename };
}

// 单个下载
async function downloadOriginal(project: Project) {
  if (!project.original_image_url) return;
  const styleName = STYLE_NAMES[project.style_id] ?? project.style_id;
  const filename = `${project.child_name}_${project.project_name || '未命名'}_${styleName}.jpg`;
  const { blob } = await downloadUrl(project.original_image_url, filename);
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

// 批量打包下载原图
async function batchDownloadZip(projects: Project[], setProgress: (n: number) => void) {
  const withImages = projects.filter(p => p.original_image_url);
  if (withImages.length === 0) {
    alert('没有可下载的原图');
    return;
  }

  const zip = new JSZip();
  const folder = zip.folder('原图批量下载');

  for (let i = 0; i < withImages.length; i++) {
    const p = withImages[i];
    setProgress(Math.round((i + 1) / withImages.length * 100));
    const styleName = STYLE_NAMES[p.style_id] ?? p.style_id;
    const filename = `${p.child_name}_${p.project_name || '未命名'}_${styleName}.jpg`;
    try {
      const response = await fetch(p.original_image_url!);
      const blob = await response.blob();
      folder?.file(filename, blob);
    } catch (err) {
      console.warn(`下载失败: ${filename}`, err);
    }
  }

  setProgress(100);
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `原图批量下载_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.zip`);
  setProgress(0);
}

export default function TeacherPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [nameSearch, setNameSearch] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

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

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (nameSearch && !p.child_name.toLowerCase().includes(nameSearch.toLowerCase())) return false;
      return true;
    });
  }, [projects, statusFilter, nameSearch]);

  const stats = useMemo(() => ({
    all: projects.length,
    pending: projects.filter(p => p.status === 'pending').length,
    processing: projects.filter(p => p.status === 'processing').length,
    completed: projects.filter(p => p.status === 'completed').length,
  }), [projects]);

  const downloadableCount = filteredProjects.filter(p => p.original_image_url).length;

  const handleBatchDownload = () => {
    if (downloading) return;
    if (!confirm(`即将下载 ${downloadableCount} 张原图并打包，请稍候...`)) return;
    setDownloading(true);
    batchDownloadZip(filteredProjects, setDownloadProgress)
      .finally(() => setDownloading(false));
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
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <h1 className="text-3xl md:text-5xl font-bold text-orange-600">👨‍🏫 老师工作台</h1>
          <div className="flex gap-3 items-center flex-wrap">
            {downloading ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white rounded-2xl shadow text-sm font-bold">
                <span className="animate-spin">⏳</span>
                打包中... {downloadProgress}%
                <div className="w-24 h-2 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: downloadProgress + '%' }} />
                </div>
              </div>
            ) : (
              <button onClick={handleBatchDownload} disabled={downloadableCount === 0}
                className="px-4 py-3 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600 shadow text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                📥 批量下载原图 ({downloadableCount})
              </button>
            )}
            <Link href="/" className="px-6 py-3 bg-white/60 backdrop-blur rounded-2xl font-bold text-orange-700 hover:bg-white shadow text-sm">← 返回首页</Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-2xl mb-6">
            <p className="text-red-800 font-bold">{error}</p>
          </div>
        )}

        {/* 统计卡片 */}
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
                <div key={p.id} className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1">
                  {/* 图片区域 */}
                  <div className="relative h-36 md:h-48 bg-gradient-to-r from-orange-200 to-red-200 flex items-center justify-center overflow-hidden">
                    {p.original_image_url ? (
                      <img src={p.original_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-7xl opacity-40">🎨</div>
                    )}
                    {/* 操作按钮组 - 只保留原图下载 */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {p.original_image_url && (
                        <button onClick={() => downloadOriginal(p)}
                          className="px-2.5 py-1.5 bg-white/90 backdrop-blur rounded-xl text-xs font-bold text-green-700 hover:bg-white shadow flex items-center gap-1">
                          📥 原图
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 信息区域 */}
                  <Link href={`/teacher/projects/${p.id}`} className="block p-4 md:p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{p.project_name || '未命名'}</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${info.color}`}>{info.text}</span>
                      <span className="text-gray-400 text-xs">{p.style_name ?? p.style_id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-600 text-sm font-bold">👦 {p.child_name}</span>
                      <span className="text-gray-400 text-xs">{formatDate(p.created_at)}</span>
                    </div>
                  </Link>
                </div>
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
