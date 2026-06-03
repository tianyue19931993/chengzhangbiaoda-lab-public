'use client';

import { useState } from 'react';
import Link from 'next/link';
import KidButton from '@/components/KidButton';

export default function StatusPage() {
  const [checks, setChecks] = useState<{ supabase: string; storage: string }>({
    supabase: 'pending', storage: 'pending',
  });
  const [checking, setChecking] = useState(false);

  const runChecks = async () => {
    setChecking(true);
    setChecks({ supabase: 'pending', storage: 'pending' });

    try {
      const res = await fetch('/api/projects');
      setChecks(prev => ({ ...prev, supabase: res.ok ? 'success' : 'error' }));
    } catch { setChecks(prev => ({ ...prev, supabase: 'error' })); }

    try {
      const res = await fetch('/api/upload', { method: 'POST' });
      setChecks(prev => ({ ...prev, storage: res.status === 400 ? 'success' : 'error' }));
    } catch { setChecks(prev => ({ ...prev, storage: 'error' })); }

    setChecking(false);
  };

  const badge = (s: string) => {
    if (s === 'success') return <span className="px-4 py-2 bg-green-200 text-green-800 rounded-full font-bold">OK</span>;
    if (s === 'error') return <span className="px-4 py-2 bg-red-200 text-red-800 rounded-full font-bold">Error</span>;
    return <span className="px-4 py-2 bg-yellow-200 text-yellow-800 rounded-full font-bold">Pending...</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-center text-purple-600 mb-12">System Status</h1>
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          <div className="space-y-8 mb-12">
            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Supabase DB</h3>
                <p className="text-gray-600">Database connection</p>
              </div>
              {badge(checks.supabase)}
            </div>
            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Storage</h3>
                <p className="text-gray-600">File upload buckets</p>
              </div>
              {badge(checks.storage)}
            </div>
          </div>
          <div className="text-center space-y-6">
            <KidButton onClick={runChecks} disabled={checking}
              className="bg-gradient-to-r from-blue-400 to-green-400 text-white text-2xl px-12 py-6">
              {checking ? 'Checking...' : 'Run Checks'}
            </KidButton>
            <div className="flex justify-center space-x-6">
              <Link href="/"><KidButton className="bg-gray-400 text-white">Home</KidButton></Link>
              <Link href="/upload"><KidButton className="bg-gradient-to-r from-pink-400 to-purple-400 text-white">Upload</KidButton></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
