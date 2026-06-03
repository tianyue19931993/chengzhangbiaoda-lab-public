'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import KidButton from '@/components/KidButton';
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

// 通用下载函数（fetch blob 方式，兼容手机）
async function downloadUrl(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    window.open(url, '_blank');
  }
}

export default function MyWorksPage() {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 学生身份：先选择/输入名字才显示作品
  const [studentName, setStudentName] = useState<string>('');
  const [nameInput, setNameInput] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);

  useEffect(() => {
    // 尝试从 sessionStorage 读取已保存的学生名字
    const saved = sessionStorage.getItem('student_name');
    if (saved) {
      setStudentName(saved);
    } else {
      setShowNameModal(true);
    }
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) setAllProjects(data.data.projects ?? []);
      else setError(data.error ?? '加载失败');
    } catch (e: any) {
      setError(e.message ?? '网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 根据已选名字过滤
  const myProjects = allProjects.filter(p =>
    p.child_name.trim() === studentName.trim()
  );

  const handleNameConfirm = () => {
    const name = nameInput.trim();
    if (!name) return;
    setStudentName(name);
    sessionStorage.setItem('student_name', name);
    setShowNameModal(false);
  };

  const handleNameChange = () => {
    setStudentName('');
    setNameInput('');
    sessionStorage.removeItem('student_name');
    setShowNameModal(true);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100">
      <div className="text-6xl animate-bounce mb-4">🎨</div>
      <p className="text-2xl text-purple-600 font-bold">加载中...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      {/* 名字选择弹窗 */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
            <div className="text-6xl mb-4">👦</div>
            <h2 className="text-2xl font-bold text-purple-700 mb-2">请输入你的名字</h2>
            <p className="text-gray-500 text-sm mb-6">请输入你在报名时登记的名字，系统将只展示你的作品</p>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameConfirm()}
              placeholder="例如：小明"
              className="w-full text-center text-2xl border-2 border-purple-200 rounded-2xl py-3 px-4 mb-4 outline-none focus:border-purple-400"
              autoFocus
            />
            <button onClick={handleNameConfirm}
              className="w-full py-3 bg-purple-500 text-white rounded-2xl font-bold text-lg hover:bg-purple-600 shadow-lg">
              进入我的作品 👉
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <h1 className="text-3xl md:text-5xl font-bold text-purple-600">🎨 我的作品</h1>
          <div className="flex gap-3 items-center">
            <span className="px-4 py-2 bg-purple-100 rounded-2xl text-purple-700 font-bold text-sm md:text-base">
              👦 {studentName}（{myProjects.length} 件）
            </span>
            <button onClick={handleNameChange}
              className="px-4 py-2 bg-white/60 rounded-2xl text-purple-700 text-sm font-bold hover:bg-white shadow">
              切换名字
            </button>
            <Link href="/" className="px-6 py-3 bg-white/60 backdrop-blur rounded-2xl font-bold text-purple-700 hover:bg-white shadow">← 返回首页</Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-2xl mb-6">
            <p className="text-red-800 font-bold">{error}</p>
          </div>
        )}

        {myProjects.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
            <div className="text-6xl md:text-8xl mb-4">🖼️</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">还没有作品</h2>
            <p className="text-gray-500">上传你的第一幅创意画，开启动画之旅吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {myProjects.map((p) => {
              const isDone = p.status === 'completed';
              const isProcessing = p.status === 'processing';
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="block">
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer">
                    {/* 缩略图 */}
                    <div className="relative h-40 md:h-52 bg-gradient-to-r from-blue-200 to-purple-200 flex items-center justify-center overflow-hidden">
                      {p.storyboard_image_url ? (
                        <img src={p.storyboard_image_url} alt="" className="w-full h-full object-cover" />
                      ) : p.original_image_url ? (
                        <img src={p.original_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-7xl opacity-40">🎨</div>
                      )}
                      {/* 状态标签 */}
                      <div className="absolute top-2 left-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow ${
                          isDone ? 'bg-green-100 text-green-700' :
                          isProcessing ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {isDone ? '✅ 已完成' : isProcessing ? '⚙️ 处理中' : '⏳ 等待中'}
                        </span>
                      </div>
                    </div>
                    {/* 信息 */}
                    <div className="p-4 md:p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{p.project_name || '未命名'}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-purple-600 text-sm font-bold">{p.style_name ?? p.style_id}</span>
                        <span className="text-gray-400 text-xs">{formatDate(p.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center flex gap-4 justify-center flex-wrap">
          <button onClick={loadProjects} className="px-8 py-3 bg-purple-500 text-white rounded-2xl font-bold hover:bg-purple-600 shadow-lg">🔄 刷新</button>
          <Link href="/upload"><KidButton className="bg-orange-500 text-white text-sm px-6 py-3">🎨 继续创作</KidButton></Link>
        </div>
      </div>
    </div>
  );
}
