'use client';

import { useState } from 'react';
import KidButton from '@/components/KidButton';

export default function Home() {
  const handleTeacherLogin = async () => {
    const inputPassword = prompt('请输入老师端密码：');
    if (!inputPassword) return;

    try {
      const res = await fetch('/api/teacher/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPassword }),
      });
      const data = await res.json();
      
      if (data.success) {
        window.location.href = '/teacher';
      } else {
        alert('密码错误！');
      }
    } catch (err: any) {
      alert(`验证失败：${err.message}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-6xl font-bold text-purple-600 mb-8">
        成长表达实验室 D
      </h1>
      <p className="text-2xl text-gray-700 mb-12 text-center">
        创意不设限，快来把想法变成动态惊喜吧～
      </p>
      
      <div className="space-y-6">
        <KidButton 
          href="/select-student"
          className="bg-gradient-to-r from-pink-400 to-purple-400 text-white"
        >
          🎨 开始创作
        </KidButton>
        
        <KidButton 
          href="/my-works"
          className="bg-gradient-to-r from-blue-400 to-green-400 text-white"
        >
          📺 我的作品
        </KidButton>

        <KidButton 
          onClick={handleTeacherLogin}
          className="bg-gradient-to-r from-orange-400 to-red-400 text-white"
        >
          👨‍🏫 老师端
        </KidButton>
      </div>
    </div>
  );
}
