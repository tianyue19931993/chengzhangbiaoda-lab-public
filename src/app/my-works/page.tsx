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

interface SelectedStudent {
  id: string;
  name: string;
  student_code: string;
  institution: string;
  activity_date: string;
  session_number: number;
}

// 内嵌选人组件（用于我的作品页）
function EmbeddedStudentSelector({ onSelected }: { onSelected: (student: SelectedStudent) => void }) {
  const [nameInput, setNameInput] = useState('');
  const [users, setUsers] = useState<SelectedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SelectedStudent | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    searchUsers('', today);
  }, []);

  const searchUsers = async (name: string, date?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (name) params.set('name', name);
      if (date) params.set('date', date);
      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) setUsers(data.data ?? []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleConfirm = () => {
    if (!selectedUser) return;
    sessionStorage.setItem('selected_student', JSON.stringify(selectedUser));
    onSelected(selectedUser);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎒</div>
          <h1 className="text-3xl font-bold text-purple-700 mb-2">查看我的作品</h1>
          <p className="text-purple-500">请先找到你的名字</p>
        </div>

        <form onSubmit={(e: React.FormEvent) => { e.preventDefault(); searchUsers(nameInput.trim()); }} className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex gap-2">
            <input type="text" value={nameInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNameInput(e.target.value)}
              placeholder="输入你的名字搜索..."
              className="flex-1 text-lg outline-none border-2 border-purple-200 rounded-2xl py-3 px-4 focus:border-purple-400" />
            <button type="submit" className="px-6 py-3 bg-purple-500 text-white rounded-2xl font-bold hover:bg-purple-600 shadow text-lg">🔍</button>
          </div>
        </form>

        {loading && (
          <div className="text-center py-8"><div className="text-4xl animate-bounce">🔍</div><p className="text-purple-500 mt-2 font-bold">搜索中...</p></div>
        )}

        {!loading && users.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="divide-y divide-gray-50">
              {users.map(user => (
                <button key={user.id} onClick={() => setSelectedUser(user)}
                  className={`w-full text-left p-4 flex items-center gap-4 transition-all ${selectedUser?.id === user.id ? 'bg-purple-100' : 'hover:bg-purple-50'}`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedUser?.id === user.id ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}`}>
                    {selectedUser?.id === user.id && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1">
                    <span className="text-xl font-bold text-gray-800">{user.name}</span>
                    <p className="text-gray-500 text-sm">{user.institution}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedUser && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t shadow-lg">
            <div className="max-w-lg mx-auto flex items-center gap-4">
              <div className="flex-1">
                <p className="font-bold text-purple-700">{selectedUser.name}</p>
                <p className="text-gray-400 text-xs">{selectedUser.institution}</p>
              </div>
              <button onClick={handleConfirm} className="px-8 py-3 bg-gradient-to-r from-orange-400 to-red-400 text-white rounded-2xl font-bold text-lg shadow-lg">
                查看我的作品 →
              </button>
            </div>
          </div>
        )}

        <div className="mt-20 text-center">
          <Link href="/" className="text-purple-400 text-sm hover:text-purple-600">← 返回首页</Link>
        </div>
      </div>
    </div>
  );
}

// 通用下载（fetch blob 方式）
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
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('selected_student');
    if (!stored) {
      setRedirecting(false);
      return;
    }
    const student: SelectedStudent = JSON.parse(stored);
    setSelectedStudent(student);
    loadProjects(student.id);
  }, []);

  const loadProjects = async (userId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects?userId=${userId}`);
      const data = await res.json();
      if (data.success) setAllProjects(data.data.projects ?? []);
      else setError(data.error ?? '加载失败');
    } catch (e: any) {
      setError(e.message ?? '网络错误');
    } finally {
      setLoading(false);
    }
  };

  if (redirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100">
        <div className="text-6xl animate-bounce mb-4">🎨</div>
        <p className="text-2xl text-purple-600 font-bold">加载中...</p>
      </div>
    );
  }

  // 没有选过名字，显示选名字界面（内嵌在当前页面）
  if (!selectedStudent && !redirecting) {
    return <EmbeddedStudentSelector onSelected={(student) => {
      setSelectedStudent(student);
      loadProjects(student.id);
    }} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="text-4xl">👦</div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-purple-600">我的作品</h1>
              <p className="text-purple-400 text-sm">{selectedStudent.name} · {selectedStudent.institution}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="px-4 py-2 bg-purple-100 rounded-2xl text-purple-700 font-bold text-sm">
              共 {allProjects.length} 件作品
            </span>
            <Link href="/select-student" className="px-4 py-2 bg-white/60 rounded-2xl text-purple-700 text-sm font-bold hover:bg-white shadow">
              切换名字
            </Link>
            <Link href="/" className="px-6 py-3 bg-white/60 backdrop-blur rounded-2xl font-bold text-purple-700 hover:bg-white shadow text-sm">← 返回首页</Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-2xl mb-6">
            <p className="text-red-800 font-bold">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center">
            <div className="text-6xl animate-bounce mb-4">🎨</div>
            <p className="text-2xl text-purple-600 font-bold">加载中...</p>
          </div>
        ) : allProjects.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
            <div className="text-6xl md:text-8xl mb-4">🖼️</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">还没有作品</h2>
            <p className="text-gray-500">上传你的第一幅创意画，开启动画之旅吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {allProjects.map((p) => {
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
          <button onClick={() => loadProjects(selectedStudent!.id)} className="px-8 py-3 bg-purple-500 text-white rounded-2xl font-bold hover:bg-purple-600 shadow-lg">🔄 刷新</button>
          <Link href="/upload"><KidButton className="bg-orange-500 text-white text-sm px-6 py-3">🎨 继续创作</KidButton></Link>
        </div>
      </div>
    </div>
  );
}
