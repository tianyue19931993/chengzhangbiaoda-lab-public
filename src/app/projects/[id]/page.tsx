'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import KidButton from '@/components/KidButton';

interface SelectedStudent {
  id: string;
  name: string;
  student_code: string;
  institution: string;
  activity_date: string;
  session_number: number;
}

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
  user_id?: string;
  user_name?: string;
  user_institution?: string;
  user_activity_date?: string;
  user_session_number?: number;
  user_student_code?: string;
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

const SESSION_TEXT: Record<number, string> = {
  1: '第一场', 2: '第二场', 3: '第三场', 4: '第四场',
  5: '第五场', 6: '第六场', 7: '第七场', 8: '第八场',
  9: '第九场', 10: '第十场',
};

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

// 图片查看器（纯查看，无按钮）
function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white text-2xl hover:bg-white/40">
        ✕
      </button>
      <img src={src} alt="查看大图" className="max-w-full max-h-[85vh] rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState('');
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [currentStudent, setCurrentStudent] = useState<SelectedStudent | null>(null);
  const [notOwner, setNotOwner] = useState(false);

  useEffect(() => { params.then(({ id }) => setProjectId(id)); }, [params]);

  // 获取当前登录学生
  useEffect(() => {
    const stored = sessionStorage.getItem('selected_student');
    if (stored) setCurrentStudent(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    fetch('/api/projects/' + projectId)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const p = data.data.project;
          setProject(p);
          // 安全校验：只有自己的作品才能查看
          if (currentStudent && p.user_id && p.user_id !== currentStudent.id) {
            setNotOwner(true);
          }
        } else {
          setError(data.error ?? '未知错误');
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, currentStudent]);

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { setViewerSrc(null); setShowTip(false); } };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [showTip, setShowTip] = useState(false); // 微信提示

  // 打开视频 - 多策略尝试
  const handleOpenVideo = () => {
    if (!project?.video_url) return;
    
    const url = project.video_url;
    const isWechatEnv = /MicroMessenger/i.test(navigator.userAgent);
    
    if (!isWechatEnv) {
      // 非微信环境：直接跳转
      window.location.href = url;
      return;
    }
    
    // 微信环境：先尝试直接跳转，同时显示复制提示作为 fallback
    // 尝试方法1：window.top.location（可能触发外部浏览器）
    try { window.top!.location.href = url; } catch {}
    
    // 显示复制提示（无论上面是否成功）
    setShowTip(true);
  };

  // 复制链接
  const copyLink = async () => {
    if (!project?.video_url) return;
    try {
      await navigator.clipboard.writeText(project.video_url);
      alert('✅ 链接已复制！请打开 Safari 浏览器粘贴访问，长按视频即可保存到相册');
      setShowTip(false);
    } catch {
      prompt('复制此链接，打开浏览器访问：', project.video_url);
      setShowTip(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100">
      <div className="text-6xl animate-bounce mb-4">🎬</div>
      <p className="text-2xl text-purple-600 font-bold">加载中...</p>
    </div>
  );

  if (notOwner) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100 p-8">
      <div className="text-6xl mb-4">🚫</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">这不是你的作品</h2>
      <p className="text-gray-500 mb-6">请回到「我的作品」查看自己的作品</p>
      <Link href="/my-works" className="px-8 py-4 bg-purple-500 text-white rounded-3xl font-bold text-xl hover:bg-purple-600">← 我的作品</Link>
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

  const studentDisplay = project.user_name
    ? `${project.user_name} · ${project.user_institution ?? ''} · ${formatDate(project.user_activity_date ?? '')} · ${SESSION_TEXT[project.user_session_number ?? 1] ?? ''}`
    : project.child_name;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      {viewerSrc && <ImageViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}

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
            {project.user_name ? (
              <span>👦 {studentDisplay}</span>
            ) : (
              <span>👦 {project.child_name} · {STYLE_NAMES[project.style_id] ?? project.style_id}</span>
            )}
          </p>
          {project.user_student_code && (
            <p className="text-gray-400 text-xs text-center mt-1">学号：{project.user_student_code}</p>
          )}
          <p className="text-gray-400 text-xs text-center mt-1">
            创建时间：{new Date(project.created_at).toLocaleString('zh-CN')}
          </p>
        </div>

        {/* 原创画作 - 点击放大 */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📷 我的创意画</h2>
          {project.original_image_url ? (
            <div className="cursor-pointer" onClick={() => setViewerSrc(project.original_image_url!)}>
              <img src={project.original_image_url} alt="原创画作"
                className="max-w-full rounded-2xl shadow-lg mx-auto hover:opacity-90 transition-opacity" />
              <p className="text-center text-gray-400 text-sm mt-2">👆 长按保存 / 点击查看大图</p>
            </div>
          ) : (
            <div className="w-full h-48 rounded-2xl bg-gray-100 flex items-center justify-center">
              <p className="text-gray-400">暂无图片</p>
            </div>
          )}
        </section>

        {/* 九宫格分镜图 */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🎬 九宫格分镜</h2>
          {project.storyboard_image_url ? (
            <div className="cursor-pointer" onClick={() => setViewerSrc(project.storyboard_image_url!)}>
              <img src={project.storyboard_image_url} alt="九宫格分镜"
                className="max-w-full rounded-2xl shadow-lg mx-auto hover:opacity-90 transition-opacity" />
              <p className="text-center text-gray-400 text-sm mt-2">👆 点击查看大图 · 长按保存到本地</p>
            </div>
          ) : (
            <div className="w-full max-h-80 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-dashed border-purple-200 flex flex-col items-center justify-center mx-auto">
              <div className="text-6xl mb-3">🎬</div>
              <p className="text-lg text-purple-400 font-bold">九宫格分镜图</p>
              <p className="text-sm text-gray-400 mt-1">正在制作中...</p>
            </div>
          )}
        </section>

        {/* 动画视频 */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🎥 动画视频</h2>
          {project.video_url ? (
            <div>
              <video src={project.video_url} controls playsInline className="w-full rounded-2xl shadow-lg mx-auto" />
              <div className="mt-4">
                <button
                  onClick={handleOpenVideo}
                  className="block w-full py-4 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:opacity-90 transition-opacity text-center"
                >
                  📱 保存到手机相册
                </button>
                <p className="text-center text-gray-400 text-xs mt-3">💡 点击按钮打开视频，长按画面保存到相册</p>
              </div>
            </div>
          ) : (
            <div className="w-full max-h-80 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 border-4 border-dashed border-orange-200 flex flex-col items-center justify-center mx-auto">
              <div className="text-6xl mb-3">🎥</div>
              <p className="text-lg text-orange-400 font-bold">动画视频</p>
              <p className="text-sm text-gray-400 mt-1">正在制作中...</p>
            </div>
          )}
        </section>

        {/* 返回按钮 */}
        <div className="text-center pb-8">
          <Link href="/my-works">
            <KidButton className="bg-gray-400 text-white text-sm px-4 py-2 md:px-6 md:py-3">← 返回我的作品</KidButton>
          </Link>
        </div>

      </div>

      {/* 微信环境提示 */}
      {showTip && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowTip(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-5xl">📱</div>
            <h3 className="text-xl font-bold text-gray-800">在浏览器中打开</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              微信无法直接保存视频<br/>
              请复制链接后用 Safari 打开
            </p>
            <div className="space-y-2">
              <button onClick={copyLink}
                className="w-full py-3 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-2xl font-bold shadow-lg hover:opacity-90">
                📋 复制链接
              </button>
              <button onClick={() => setShowTip(false)}
                className="w-full py-2 text-gray-400 text-sm">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
