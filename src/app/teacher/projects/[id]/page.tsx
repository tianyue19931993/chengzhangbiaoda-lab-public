'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
  style_name?: string;
}

interface ExportLog {
  id: string;
  project_id: number;
  teacher_id: string;
  format: string;
  file_url: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending:    { text: '⏳ 等待处理',     color: 'bg-yellow-100 text-yellow-700' },
  processing: { text: '⚙️ 处理中',       color: 'bg-blue-100 text-blue-700' },
  completed:  { text: '✅ 已完成',        color: 'bg-green-100 text-green-700' },
  failed:     { text: '❌ 失败',          color: 'bg-red-100 text-red-700' },
};

// 七牛云直传上传函数
async function uploadToQiniu(
  projectId: number,
  file: File,
  format: 'storyboard' | 'video'
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  try {
    // 1. 从 API 获取七牛上传凭证
    const tokenRes = await fetch(
      `/api/teacher/projects/${projectId}/export?format=${format}&fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.success) {
      return { success: false, error: tokenData.error || '获取上传凭证失败' };
    }

    const { token, key, uploadUrl, publicUrl } = tokenData.data;

    // 2. 前端直接上传到七牛云（不经过 Vercel，无大小限制）
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('token', token);
    uploadFormData.append('key', key);

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadFormData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '上传失败');
      return { success: false, error: errText };
    }

    // 3. 通知后端更新数据库
    const formData = new FormData();
    formData.append('format', format);
    formData.append('fileUrl', publicUrl);

    const notifyRes = await fetch(`/api/teacher/projects/${projectId}/export`, {
      method: 'POST',
      body: formData,
    });
    const notifyData = await notifyRes.json();

    if (!notifyData.success) {
      return { success: false, error: notifyData.error || '更新数据库失败' };
    }

    return { success: true, fileUrl: publicUrl };
  } catch (err: any) {
    return { success: false, error: err?.message || '上传失败' };
  }
}

export default function TeacherProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<number | null>(null);

  const [uploadingStoryboard, setUploadingStoryboard] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [sbFileInput, setSbFileInput] = useState<HTMLInputElement | null>(null);

  const [vidFileInput, setVidFileInput] = useState<HTMLInputElement | null>(null);

  const router = useRouter();

  useEffect(() => { params.then(({ id }) => setProjectId(parseInt(id, 10))); }, [params]);

  useEffect(() => {
    if (projectId === null || isNaN(projectId)) return;
    fetch('/api/teacher/projects/' + projectId)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setProject(data.data.project);
          setLogs(data.data.export_logs ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleUpload = async (file: File, format: 'storyboard' | 'video') => {
    if (projectId === null) return;
    
    const setUploading = format === 'storyboard' ? setUploadingStoryboard : setUploadingVideo;
    setUploading(true);

    try {
      const result = await uploadToQiniu(projectId, file, format);

      if (result.success) {
        const newStatus = format === 'storyboard' ? 'processing' : 'completed';
        await fetch('/api/teacher/projects/' + projectId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        fetch('/api/teacher/projects/' + projectId)
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              setProject(data.data.project);
              setLogs(data.data.export_logs ?? []);
            }
          });
      } else {
        alert('上传失败：' + (result.error || '未知错误'));
      }
    } catch (e: any) {
      alert('上传失败：' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (projectId === null) return;
    if (!confirm('确定删除此作品？')) return;
    const res = await fetch('/api/teacher/projects/' + projectId, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) router.push('/teacher');
    else alert('删除失败：' + (data.error || '未知错误'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">😵</div>
          <div className="text-xl">作品不存在</div>
          <Link href="/teacher" className="mt-4 inline-block px-6 py-3 bg-purple-500 text-white rounded-2xl">返回工作台</Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[project.status] || { text: project.status, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/teacher" className="text-purple-600 hover:underline">← 返回工作台</Link>
          <button onClick={handleDelete} className="text-red-500 hover:underline">删除作品</button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">{project.child_name}</h1>
            <span className={'px-3 py-1 rounded-full text-sm font-medium ' + statusInfo.color}>{statusInfo.text}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <div className="text-gray-500 text-sm mb-2">作品名称</div>
              <div className="font-medium">{project.project_name}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-2">风格</div>
              <div className="font-medium">{project.style_name || project.style_id}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-2">创建时间</div>
              <div className="font-medium">{new Date(project.created_at).toLocaleString('zh-CN')}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="text-gray-500 text-sm mb-3">学生原图</div>
              {project.original_image_url ? (
                <img src={project.original_image_url} alt="原图" className="w-full rounded-xl" />
              ) : (
                <div className="aspect-square bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">暂无</div>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-500 text-sm">分镜图</div>
                <input
                  type="file"
                  accept="image/*"
                  ref={setSbFileInput}
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'storyboard')}
                />
                <button
                  onClick={() => sbFileInput?.click()}
                  disabled={uploadingStoryboard}
                  className="text-sm text-purple-600 hover:underline disabled:opacity-50"
                >
                  {uploadingStoryboard ? '上传中...' : '上传分镜图'}
                </button>
              </div>
              {project.storyboard_image_url ? (
                <img src={project.storyboard_image_url} alt="分镜图" className="w-full rounded-xl" />
              ) : (
                <div className="aspect-square bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">暂无</div>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-500 text-sm">视频</div>
                <input
                  type="file"
                  accept="video/*"
                  ref={setVidFileInput}
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'video')}
                />
                <button
                  onClick={() => vidFileInput?.click()}
                  disabled={uploadingVideo}
                  className="text-sm text-purple-600 hover:underline disabled:opacity-50"
                >
                  {uploadingVideo ? '上传中...' : '上传视频'}
                </button>
              </div>
              {project.video_url ? (
                <video src={project.video_url} controls className="w-full rounded-xl" />
              ) : (
                <div className="aspect-video bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">暂无</div>
              )}
            </div>
          </div>

          {logs.length > 0 && (
            <div className="mt-8">
              <div className="text-gray-500 text-sm mb-3">操作记录</div>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                    <div>
                      <span className="font-medium">{log.format === 'storyboard' ? '分镜图' : '视频'}</span>
                      <span className="text-gray-500 ml-2">上传者：{log.teacher_id}</span>
                    </div>
                    <div className="text-gray-500">{new Date(log.created_at).toLocaleString('zh-CN')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
