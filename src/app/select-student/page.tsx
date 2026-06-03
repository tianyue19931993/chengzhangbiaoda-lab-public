'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  student_code: string;
  name: string;
  institution: string;
  activity_date: string;
  session_number: number;
}

const SESSION_TEXT: Record<number, string> = {
  1: '第一场', 2: '第二场', 3: '第三场', 4: '第四场',
  5: '第五场', 6: '第六场', 7: '第七场', 8: '第八场',
  9: '第九场', 10: '第十场',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function SelectStudentPage() {
  const router = useRouter();
  const [nameInput, setNameInput] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAll, setShowAll] = useState(false); // 是否显示全部

  // 初始加载全部学生（不限制日期）
  useEffect(() => {
    searchUsers('');
  }, []);

  const searchUsers = async (name: string, date?: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (name) params.set('name', name);
      if (date) params.set('date', date);
      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) setUsers(data.data ?? []);
      else setError(data.error ?? '查询失败');
    } catch (e: any) {
      setError(e.message ?? '网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchUsers(nameInput.trim(), showAll ? undefined : undefined);
  };

  const handleSelect = (user: User) => {
    setSelectedUser(user);
  };

  const handleConfirm = () => {
    if (!selectedUser) return;
    // 存储到 sessionStorage，跳转到上传页
    sessionStorage.setItem('selected_student', JSON.stringify(selectedUser));
    router.push('/upload');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        {/* 顶部 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎒</div>
          <h1 className="text-3xl md:text-4xl font-bold text-purple-700 mb-2">开始创作</h1>
          <p className="text-purple-500">请先找到你的名字</p>
        </div>

        {/* 搜索框 */}
        <form onSubmit={handleNameSubmit} className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="输入你的名字搜索..."
              className="flex-1 text-lg outline-none border-2 border-purple-200 rounded-2xl py-3 px-4 focus:border-purple-400"
              autoFocus
            />
            <button type="submit"
              className="px-6 py-3 bg-purple-500 text-white rounded-2xl font-bold hover:bg-purple-600 shadow text-lg">
              🔍
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
              <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)}
                className="w-4 h-4 accent-purple-500" />
              搜索全部日期（不限于今天）
            </label>
          </div>
        </form>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-2xl mb-4">
            <p className="text-red-700 font-bold">{error}</p>
          </div>
        )}

        {/* 加载中 */}
        {loading && (
          <div className="text-center py-8">
            <div className="text-4xl animate-bounce">🔍</div>
            <p className="text-purple-500 mt-2 font-bold">搜索中...</p>
          </div>
        )}

        {/* 结果列表 */}
        {!loading && users.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <p className="text-gray-400 text-sm">找到 {users.length} 位同学</p>
            </div>
            <div className="divide-y divide-gray-50">
              {users.map(user => {
                const isSelected = selectedUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelect(user)}
                    className={`w-full text-left p-4 md:p-5 flex items-center gap-4 transition-all hover:bg-purple-50 ${isSelected ? 'bg-purple-100' : ''}`}
                  >
                    {/* 选择圆圈 */}
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}`}>
                      {isSelected && <span className="text-white text-xs">✓</span>}
                    </div>
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-bold text-gray-800">{user.name}</span>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-bold">
                          第{SESSION_TEXT[user.session_number] ?? user.session_number}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm truncate">{user.institution}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{formatDate(user.activity_date)}</p>
                    </div>
                    {/* 编号 */}
                    <div className="text-gray-300 text-xs font-mono flex-shrink-0">{user.student_code}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 无结果 */}
        {!loading && nameInput && users.length === 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="text-5xl mb-4">🤔</div>
            <p className="text-gray-500 font-bold">没找到 "{nameInput}"</p>
            <p className="text-gray-400 text-sm mt-2">请联系老师确认是否已报名</p>
          </div>
        )}

        {/* 确认按钮 */}
        {selectedUser && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-gray-200 shadow-lg">
            <div className="max-w-lg mx-auto flex items-center gap-4">
              <div className="flex-1">
                <p className="font-bold text-purple-700">{selectedUser.name}</p>
                <p className="text-gray-400 text-xs">{selectedUser.institution} · {formatDate(selectedUser.activity_date)} · {SESSION_TEXT[selectedUser.session_number]}</p>
              </div>
              <button onClick={handleConfirm}
                className="px-8 py-3 bg-gradient-to-r from-orange-400 to-red-400 text-white rounded-2xl font-bold text-lg shadow-lg hover:opacity-90">
                开始创作 →
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-purple-400 text-sm hover:text-purple-600">← 返回首页</Link>
        </div>
      </div>
    </div>
  );
}
