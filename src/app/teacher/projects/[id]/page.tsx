'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
  style_name?: string;
}

interface ExportLog {
  id: string;
  project_id: string;
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
  projectId: string,
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
  const [projectId, setProjectId] = useState('');

  const [uploadingStoryboard, setUploadingStoryboard] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [sbFileInput, setSbFileInput] = useState<HTMLInputElement | null>(null);
  const [vidFileInput, setVidFileInput] = useState<HTMLInputElement | null>(null);

  const router = useRouter();

  useEffect(() => { params.then(({ id }) => setProjectId(id)); }, [params]);

  useEffect(() => {
    if (!projectId) return;
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
          .then(d => {
            if (d.success) {
              setProject(d.data.project);
              setLogs(d.data.export_logs ?? []);
            }
          });

        const statusHint = format === 'storyboard' ? '状态已更新为：⚙️ 处理中' : '状态已更新为：✅ 已完成';
        alert((format === 'storyboard' ? '分镜图' : '视频') + '上传成功！' + statusHint);
      } else {
        alert('上传失败：' + result.error);
      }
    } catch (e: any) {
      alert('错误：' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch('/api/teacher/projects/' + projectId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) setProject(data.data.project);
    } catch {}
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-100 to-red-100">
      <div className="text-6xl animate-bounce mb-4">⏳</div>
    </div>
  );

  if (!project) return null;

  const info = STATUS_MAP[project.status] ?? { text: project.status, color: 'bg-gray-100' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 to-red-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* 头部 */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="px-6 py-3 bg-white/60 backdrop-blur rounded-2xl font-bold text-orange-700 hover:bg-white transition-colors shadow">
            ← 返回
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-orange-700">{project.project_name || '未命名'}</h1>
          <span className={'px-4 py-2 rounded-full text-sm font-bold ' + info.color}>{info.text}</span>
        </div>

        {/* 学生信息 */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="font-bold text-gray-500">小朋友：</span> {project.child_name}</div>
            <div><span className="font-bold text-gray-500">风格：</span> {project.style_name ?? project.style_id}</div>
            <div><span className="font-bold text-gray-500">创建时间：</span> {new Date(project.created_at).toLocaleString('zh-CN')}</div>
            <div><span className="font-bold text-gray-500">状态：</span> {info.text}</div>
          </div>
        </div>

        {/* 原创画作 */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📷 学生原创画作</h2>
          {project.original_image_url ? (
            <img src={project.original_image_url} alt="原创画作" className="max-w-full max-h-96 rounded-2xl shadow-lg mx-auto" />
          ) : (
            <p className="text-gray-400 text-center py-8">暂无图片</p>
          )}
        </section>

        {/* 分镜图上传 */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">🎬 九宫格分镜图</h2>
            {project.storyboard_image_url && (
              <a href={project.storyboard_image_url} target="_blank" rel="noreferrer"
                className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-bold hover:bg-green-200">
                ↗ 查看
              </a>
            )}
          </div>
          {project.storyboard_image_url ? (
            <img src={project.storyboard_image_url} alt="分镜图" className="max-w-full max-h-80 rounded-2xl shadow-lg mx-auto" />
          ) : (
            <div className="w-full h-40 rounded-2xl bg-purple-50 border-2 border-dashed border-purple-200 flex items-center justify-center">
              <p className="text-purple-400">尚未上传分镜图</p>
            </div>
          )}
          <div className="mt-4 flex gap-3 justify-center">
            <input type="file" accept="image/*" ref={(el) => setSbFileInput(el)}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'storyboard'); }}
              className="hidden" />
            <button onClick={() => sbFileInput?.click()} disabled={uploadingStoryboard}
              className={'px-6 py-3 rounded-xl font-bold text-white transition-colors ' +
                (uploadingStoryboard ? 'bg-gray-400 cursor-wait' : 'bg-purple-500 hover:bg-purple-600')}>
              {uploadingStoryboard ? '上传中...' : '📎 上传分镜图'}
            </button>
          </div>
        </section>

        {/* 视频上传 */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">🎥 动画视频</h2>
            {project.video_url && (
              <a href={project.video_url} target="_blank" rel="noreferrer"
                className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-bold hover:bg-green-200">
                ↗ 查看 / 下载
              </a>
            )}
          </div>
          {project.video_url ? (
            <video src={project.video_url} controls className="w-full max-h-80 rounded-2xl shadow-lg mx-auto" />
          ) : (
            <div className="w-full h-40 rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 flex items-center justify-center">
              <p className="text-orange-400">尚未上传视频</p>
            </div>
          )}
          <div className="mt-4 flex gap-3 justify-center">
            <input type="file" accept="video/*" ref={(el) => setVidFileInput(el)}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'video'); }}
              className="hidden" />
            <button onClick={() => vidFileInput?.click()} disabled={uploadingVideo}
              className={'px-6 py-3 rounded-xl font-bold text-white transition-colors ' +
                (uploadingVideo ? 'bg-gray-400 cursor-wait' : 'bg-orange-500 hover:bg-orange-600')}>
              {uploadingVideo ? '上传中...' : '📎 上传视频'}
            </button>
          </div>
          
        </section>

        {/* 状态控制 */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">⚙️ 更新状态</h2>
          <div className="flex gap-3 flex-wrap">
            {(['pending', 'processing', 'completed'] as const).map((s) => (
              <button key={s} onClick={() => updateStatus(s)}
                className={'px-5 py-2 rounded-xl font-bold transition-colors ' +
                  (project.status === s ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                {(STATUS_MAP[s]?.text ?? s)}
              </button>
            ))}
          </div>
        </section>

        {/* 导出记录 */}
        {logs.length > 0 && (
          <section className="bg-white rounded-3xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📋 操作记录</h2>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                  <div>
                    <span className="font-bold">{log.format === 'storyboard' ? '九宫格分镜图' : '动画视频'}</span>
                    <span className="text-gray-400 ml-2">操作人：{log.teacher_id}</span>
                  </div>
                  <span className="text-gray-400">{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                  <a href={log.file_url} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline">查看</a>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
