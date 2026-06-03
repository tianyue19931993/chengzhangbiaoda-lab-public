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
  pending:    { text: '\u23f3 Pending',     color: 'bg-yellow-100 text-yellow-700' },
  processing: { text: '\u2699\ufe0f Processing', color: 'bg-blue-100 text-blue-700' },
  completed:  { text: '\u2705 Completed',  color: 'bg-green-100 text-green-700' },
  failed:     { text: '\u274c Failed',     color: 'bg-red-100 text-red-700' },
};

export default function TeacherProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState('');

  // Upload states
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);

      const res = await fetch('/api/teacher/projects/' + projectId + '/export', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        // Refresh data
        fetch('/api/teacher/projects/' + projectId)
          .then(r => r.json())
          .then(d => {
            if (d.success) {
              setProject(d.data.project);
              setLogs(d.data.export_logs ?? []);
            }
          });
        alert(format === 'storyboard' ? 'Storyboard uploaded!' : 'Video uploaded!');
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
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
      <div className="text-6xl animate-bounce mb-4">{'\u23f3'}</div>
    </div>
  );

  if (!project) return null;

  const info = STATUS_MAP[project.status] ?? { text: project.status, color: 'bg-gray-100' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 to-red-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="px-6 py-3 bg-white/60 backdrop-blur rounded-2xl font-bold text-orange-700 hover:bg-white transition-colors shadow">
            {'\u2190'} Back
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-orange-700">{project.project_name || 'Untitled'}</h1>
          <span className={'px-4 py-2 rounded-full text-sm font-bold ' + info.color}>{info.text}</span>
        </div>

        {/* Student Info */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="font-bold text-gray-500">Child:</span> {project.child_name}</div>
            <div><span className="font-bold text-gray-500">Style:</span> {project.style_name ?? project.style_id}</div>
            <div><span className="font-bold text-gray-500">Created:</span> {new Date(project.created_at).toLocaleString()}</div>
            <div><span className="font-bold text-gray-500">Status:</span> {project.status}</div>
          </div>
        </div>

        {/* Original Image */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{'\ud83d\udcf7'} Student Original Drawing</h2>
          {project.original_image_url ? (
            <img src={project.original_image_url} alt="Original" className="max-w-full max-h-96 rounded-2xl shadow-lg mx-auto" />
          ) : (
            <p className="text-gray-400 text-center py-8">No image uploaded</p>
          )}
        </section>

        {/* Storyboard Upload */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">{'\ud83d\udcfa'} Storyboard Image (9-grid)</h2>
            {project.storyboard_image_url && (
              <a href={project.storyboard_image_url} target="_blank" rel="noreferrer"
                className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-bold hover:bg-green-200">
                {'\u2197'} View
              </a>
            )}
          </div>
          {project.storyboard_image_url ? (
            <img src={project.storyboard_image_url} alt="Storyboard" className="max-w-full max-h-80 rounded-2xl shadow-lg mx-auto" />
          ) : (
            <p className="text-gray-400 text-center py-4">Not yet uploaded</p>
          )}
          <div className="mt-4 flex gap-3 justify-center">
            <input type="file" accept="image/*" ref={(el) => setSbFileInput(el)}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'storyboard'); }}
              className="hidden" />
            <button onClick={() => sbFileInput?.click()} disabled={uploadingStoryboard}
              className={'px-6 py-3 rounded-xl font-bold text-white transition-colors ' +
                (uploadingStoryboard ? 'bg-gray-400 cursor-wait' : 'bg-purple-500 hover:bg-purple-600')}>
              {uploadingStoryboard ? 'Uploading...' : '{\'\ud83d\udcce\'} Upload Storyboard'}
            </button>
          </div>
        </section>

        {/* Video Upload */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">{'\ud83c\udfac'} Animation Video</h2>
            {project.video_url && (
              <a href={project.video_url} target="_blank" rel="noreferrer"
                className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-bold hover:bg-green-200">
                {'\u2197'} View / Download
              </a>
            )}
          </div>
          {project.video_url ? (
            <video src={project.video_url} controls className="w-full max-h-80 rounded-2xl shadow-lg mx-auto" />
          ) : (
            <p className="text-gray-400 text-center py-4">Not yet uploaded</p>
          )}
          <div className="mt-4 flex gap-3 justify-center">
            <input type="file" accept="video/*" ref={(el) => setVidFileInput(el)}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'video'); }}
              className="hidden" />
            <button onClick={() => vidFileInput?.click()} disabled={uploadingVideo}
              className={'px-6 py-3 rounded-xl font-bold text-white transition-colors ' +
                (uploadingVideo ? 'bg-gray-400 cursor-wait' : 'bg-orange-500 hover:bg-orange-600')}>
              {uploadingVideo ? 'Uploading...' : '{\'\ud83d\udcce\'} Upload Video'}
            </button>
          </div>
        </section>

        {/* Status Control */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{'\u2699\ufe0f'} Update Status</h2>
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

        {/* Export History */}
        {logs.length > 0 && (
          <section className="bg-white rounded-3xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{'\ud83d\udccb'} Export History</h2>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                  <div>
                    <span className="font-bold">{log.format}</span>
                    <span className="text-gray-400 ml-2">by {log.teacher_id}</span>
                  </div>
                  <span className="text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                  <a href={log.file_url} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline">View</a>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
