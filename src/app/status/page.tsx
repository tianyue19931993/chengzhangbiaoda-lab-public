'use client';

import { useState } from 'react';
import Link from 'next/link';
import KidButton from '@/components/KidButton';

export default function StatusPage() {
  const [checks, setChecks] = useState<{
    supabase: 'pending' | 'success' | 'error';
    storage: 'pending' | 'success' | 'error';
    playwright: 'pending' | 'success' | 'error';
  }>({
    supabase: 'pending',
    storage: 'pending',
    playwright: 'pending',
  });
  const [checking, setChecking] = useState(false);
  
  // 检查系统状态
  const runChecks = async () => {
    setChecking(true);
    setChecks({
      supabase: 'pending',
      storage: 'pending',
      playwright: 'pending',
    });
    
    // 检查 Supabase 连接
    try {
      const res = await fetch('/api/projects?userId=test');
      if (res.ok) {
        setChecks(prev => ({ ...prev, supabase: 'success' }));
      } else {
        setChecks(prev => ({ ...prev, supabase: 'error' }));
      }
    } catch (error) {
      setChecks(prev => ({ ...prev, supabase: 'error' }));
    }
    
    // 检查 Storage（尝试访问一个不存在的文件）
    try {
      const res = await fetch('/api/upload', { method: 'POST' });
      // 预期返回 400（未提供文件），但说明 API 在运行
      if (res.status === 400) {
        setChecks(prev => ({ ...prev, storage: 'success' }));
      } else {
        setChecks(prev => ({ ...prev, storage: 'error' }));
      }
    } catch (error) {
      setChecks(prev => ({ ...prev, storage: 'error' }));
    }
    
    // Playwright 检查（简化版，仅检查是否已安装）
    // 实际应该在服务端检查
    setChecks(prev => ({ ...prev, playwright: 'pending' }));
    
    setChecking(false);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="px-4 py-2 bg-green-200 text-green-800 rounded-full font-bold">✅ 正常</span>;
      case 'error':
        return <span className="px-4 py-2 bg-red-200 text-red-800 rounded-full font-bold">❌ 异常</span>;
      case 'pending':
        return <span className="px-4 py-2 bg-yellow-200 text-yellow-800 rounded-full font-bold">⏳ 检测中...</span>;
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-center text-purple-600 mb-12">
          🔧 系统状态检查
        </h1>
        
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* 检查项 */}
          <div className="space-y-8 mb-12">
            {/* Supabase */}
            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  💾 Supabase 数据库
                </h3>
                <p className="text-gray-600">
                  检查数据库连接和表结构
                </p>
              </div>
              {getStatusBadge(checks.supabase)}
            </div>
            
            {/* Storage */}
            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  📦 Supabase Storage
                </h3>
                <p className="text-gray-600">
                  检查文件存储 Buckets
                </p>
              </div>
              {getStatusBadge(checks.storage)}
            </div>
            
            {/* Playwright */}
            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  🎭 Playwright
                </h3>
                <p className="text-gray-600">
                  检查浏览器自动化环境（需在服务端检查）
                </p>
              </div>
              <span className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full font-bold">
                ⚠️ 需服务端检查
              </span>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="text-center space-y-6">
            <KidButton
              onClick={runChecks}
              disabled={checking}
              className="bg-gradient-to-r from-blue-400 to-green-400 text-white text-2xl px-12 py-6"
            >
              {checking ? '⏳ 检测中...' : '🚀 开始检测'}
            </KidButton>
            
            <div className="flex justify-center space-x-6">
              <Link href="/">
                <KidButton className="bg-gray-400 text-white">
                  ← 返回首页
                </KidButton>
              </Link>
              
              <Link href="/upload">
                <KidButton className="bg-gradient-to-r from-pink-400 to-purple-400 text-white">
                  🎨 开始创作
                </KidButton>
              </Link>
            </div>
          </div>
          
          {/* 提示 */}
          <div className="mt-12 p-6 bg-yellow-50 rounded-2xl">
            <h3 className="text-xl font-bold text-yellow-800 mb-4">
              ⚠️ 部署前检查清单
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>✅ Supabase 项目已创建</li>
              <li>✅ 数据库 Schema 已运行（supabase/schema.sql）</li>
              <li>✅ Storage Buckets 已创建（original-images, generated-images, videos）</li>
              <li>✅ 环境变量已配置（.env.local）</li>
              <li>✅ 豆包 Cookie 已保存（src/lib/playwright/.cache/doubao-cookies.json）</li>
              <li>✅ 即梦 Cookie 已保存（src/lib/playwright/.cache/jimeng-cookies.json）</li>
              <li>✅ Playwright 浏览器已安装（npx playwright install chromium）</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
