'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import KidButton from '@/components/KidButton';

interface SelectedStudent {
  id: number;
  name: string;
  student_code: string;
  institution: string;
  activity_date: string;
  session_number: number;
}

interface Project {
  id: number;
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
  user_id?: number;
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
  const [projectId, setProjectId] = useState<number | null>(null);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [currentStudent, setCurrentStudent] = useState<SelectedStudent | null>(null);
  const [notOwner, setNotOwner] = useState(false);

  useEffect(() => { params.then(({ id }) => setProjectId(parseInt(id, 10))); }, [params]);

  // 获取当前登录学生
  useEffect(() => {
    const stored = sessionStorage.getItem('selected_student');
    if (stored) setCurrentStudent(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (projectId === null || isNaN(projectId)) return;
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
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewerSrc(null); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDownloadVideo = () => {
    if (!project?.id) return;
    window.location.href = `/api/download/${project.id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex flex-col items-center justify-center">
        <div className="text-2xl mb-4">😵</div>
        <div className="text-xl mb-2">{error || '作品不存在'}</div>
        <Link href="/my-works" className="mt-4 px-6 py-3 bg-purple-500 text-white rounded-2xl font-bold hover:bg-purple-600">返回我的作品</Link>
      </div>
    );
  }

  if (notOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">🚫</div>
        <div className="text-xl mb-2">这不是你的作品哦</div>
        <Link href="/my-works" className="mt-4 px-6 py-3 bg-purple-500 text-white rounded-2xl font-bold hover:bg-purple-600">返回我的作品</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/my-works" className="inline-block mb-6 text-purple-600 hover:underline font-bold">← 返回我的作品</Link>

        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">{project.child_name} 的作品</h1>
            <span className={'px-3 py-1 rounded-full text-sm font-medium ' + (project.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
              {STATUS_LABELS[project.status] || project.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
            <div>
              <div className="text-gray-500">作品名称</div>
              <div className="font-medium">{project.project_name}</div>
            </div>
            <div>
              <div className="text-gray-500">风格</div>
              <div className="font-medium">{STYLE_NAMES[project.style_id] || project.style_id}</div>
            </div>
            <div>
              <div className="text-gray-500">创建时间</div>
              <div className="font-medium">{formatDate(project.created_at)}</div>
            </div>
            {project.user_name && (
              <div>
                <div className="text-gray-500">学生姓名</div>
                <div className="font-medium">{project.user_name}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-gray-500 text-sm mb-2 font-medium">我的原图</div>
              {project.original_image_url ? (
                <img src={project.original_image_url} alt="原图" className="w-full rounded-2xl shadow cursor-pointer hover:scale-105 transition-transform" onClick={() => setViewerSrc(project.original_image_url!)} />
              ) : (
                <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">暂无</div>
              )}
            </div>

            <div>
              <div className="text-gray-500 text-sm mb-2 font-medium">分镜图</div>
              {project.storyboard_image_url ? (
                <img src={project.storyboard_image_url} alt="分镜图" className="w-full rounded-2xl shadow cursor-pointer hover:scale-105 transition-transform" onClick={() => setViewerSrc(project.storyboard_image_url!)} />
              ) : (
                <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">等待老师上传</div>
              )}
            </div>

            <div>
              <div className="text-gray-500 text-sm mb-2 font-medium">我的视频</div>
              {project.video_url ? (
                <video src={project.video_url} controls className="w-full rounded-2xl shadow" />
              ) : (
                <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">等待老师上传</div>
              )}
            </div>
          </div>

          {project.video_url && (
            <div className="mt-8 text-center">
              <KidButton onClick={handleDownloadVideo} className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
                📥 保存视频到相册
              </KidButton>
            </div>
          )}
        </div>

        {/* 图片查看器 */}
        {viewerSrc && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setViewerSrc(null)}>
            <img src={viewerSrc} alt="预览" className="max-w-full max-h-full object-contain rounded-2xl" />
          </div>
        )}
      </div>
    </div>
  );
}
