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
  updated_at: string;
  style_name?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending:    '\u23f3 Pending',
  processing: '\u2699\ufe0f Processing',
  completed:  '\u2705 Completed',
  failed:     '\u274c Failed',
};

const STYLE_NAMES: Record<string, string> = {
  pixar: '\ud83c\udfac Pixar 3D',
  chinese: '\ud83c\udfee Chinese',
  anime: '\ud83c\udf38 Anime',
  watercolor: '\ud83c\udfa8 Watercolor',
  cyberpunk: '\ud83c\udf06 Cyberpunk',
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState('');

  useEffect(() => { params.then(({ id }) => setProjectId(id)); }, [params]);

  useEffect(() => {
    if (!projectId) return;
    fetch('/api/projects/' + projectId)
      .then(r => r.json())
      .then(data => {
        if (data.success) setProject(data.data.project);
        else setError(data.error ?? 'Unknown error');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100">
      <div className="text-6xl animate-bounce mb-4">\ud83c\udfac</div>
      <p className="text-2xl text-purple-600 font-bold">Loading...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100 p-8">
      <div className="text-6xl mb-4">\ud83d\ude22</div>
      <p className="text-2xl text-red-600 font-bold mb-6">{error}</p>
      <Link href="/my-works" className="px-8 py-4 bg-purple-500 text-white rounded-3xl font-bold text-xl hover:bg-purple-600">\u2190 Back</Link>
    </div>
  );

  if (!project) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/my-works" className="px-6 py-3 bg-white/60 backdrop-blur rounded-2xl font-bold text-purple-700 hover:bg-white transition-colors shadow">
            \u2190 My Works
          </Link>
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-purple-700">{project.project_name}</h1>
            <p className="text-purple-500 text-sm">
              \ud83d\udc67 {project.child_name} \u00b7 {STYLE_NAMES[project.style_id] ?? project.style_id}
            </p>
          </div>
          <span className="px-4 py-2 bg-white/60 backdrop-blur rounded-full text-sm font-bold text-purple-600 shadow">
            {STATUS_LABELS[project.status] ?? project.status}
          </span>
        </div>

        {/* Original Image */}
        {project.original_image_url && (
          <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">\ud83d\udcf7 Original Drawing</h2>
            <img src={project.original_image_url} alt="Original" className="max-w-full rounded-2xl shadow-lg mx-auto" />
          </section>
        )}

        {/* Storyboard Image (teacher uploaded) */}
        {project.storyboard_image_url && (
          <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">\ud83d\udcfa Storyboard (9-grid)</h2>
            <img src={project.storyboard_image_url} alt="Storyboard" className="max-w-full rounded-2xl shadow-lg mx-auto" />
          </section>
        )}

        {/* Video (teacher uploaded) */}
        {project.video_url && (
          <section className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">\ud83c\udfac Animation Video</h2>
            <video src={project.video_url} controls className="w-full rounded-2xl shadow-lg" />
          </section>
        )}

        {/* Info */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div><span className="font-bold">Created:</span> {new Date(project.created_at).toLocaleString()}</div>
            <div><span className="font-bold">Updated:</span> {new Date(project.updated_at).toLocaleString()}</div>
          </div>
        </section>

      </div>
    </div>
  );
}
