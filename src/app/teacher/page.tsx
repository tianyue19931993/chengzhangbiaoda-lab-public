'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending:    { text: '\u23f3 Pending',     color: 'bg-yellow-100 text-yellow-700' },
  processing: { text: '\u2699\ufe0f Processing', color: 'bg-blue-100 text-blue-700' },
  completed:  { text: '\u2705 Completed',  color: 'bg-green-100 text-green-700' },
  failed:     { text: '\u274c Failed',     color: 'bg-red-100 text-red-700' },
};

export default function TeacherPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadAllProjects(); }, []);

  const loadAllProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/teacher/projects');
      const data = await res.json();
      if (data.success) setProjects(data.data.projects);
      else setError(data.error ?? 'Failed to load');
    } catch (e: any) {
      setError(e.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-100 to-red-100">
      <div className="text-6xl animate-bounce mb-4">\u23f3</div>
      <p className="text-2xl text-orange-600 font-bold">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 to-red-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-orange-600">\ud83d\udc68\u200d\ud83c\udfeb Teacher Dashboard</h1>
          <Link href="/" className="px-6 py-3 bg-white/60 backdrop-blur rounded-2xl font-bold text-orange-700 hover:bg-white transition-colors shadow">\u2190 Home</Link>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-2xl mb-6">
            <p className="text-red-800 font-bold">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: projects.length, color: 'from-blue-400 to-blue-600' },
            { label: 'Pending', value: projects.filter(p => p.status === 'pending').length, color: 'from-yellow-400 to-yellow-600' },
            { label: 'Processing', value: projects.filter(p => p.status === 'processing').length, color: 'from-blue-400 to-indigo-600' },
            { label: 'Completed', value: projects.filter(p => p.status === 'completed').length, color: 'from-green-400 to-green-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className={'bg-gradient-to-r ' + color + ' rounded-2xl p-4 text-white shadow-lg'}>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm opacity-90">{label}</p>
            </div>
          ))}
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
            <div className="text-6xl md:text-8xl mb-4">\ud83d\udced</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">No submissions yet</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {projects.map((p) => {
              const info = STATUS_MAP[p.status] ?? { text: p.status, color: 'bg-gray-100 text-gray-600' };
              return (
                <Link key={p.id} href={'/projects/' + p.id} className="block">
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer">
                    <div className="h-36 md:h-48 bg-gradient-to-r from-orange-200 to-red-200 flex items-center justify-center overflow-hidden">
                      {p.original_image_url ? (
                        <img src={p.original_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-7xl opacity-40">\ud83c\udfa8</div>
                      )}
                    </div>
                    <div className="p-4 md:p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{p.project_name || 'Untitled'}</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className={'px-3 py-1 rounded-full text-xs font-bold ' + info.color}>{info.text}</span>
                        <span className="text-gray-400 text-xs">{p.style_name ?? p.style_id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-orange-600 text-sm font-bold">\ud83d\udc67 {p.child_name}</span>
                        <span className="text-gray-400 text-xs">{formatDate(p.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <button onClick={loadAllProjects} className="px-8 py-3 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 shadow-lg">\ud83d\udd04 Refresh</button>
        </div>
      </div>
    </div>
  );
}
