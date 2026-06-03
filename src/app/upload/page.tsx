'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import KidButton from '@/components/KidButton';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

interface Style {
  id: string;
  name: string;
  prompt: string;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('pixar');
  const [uploading, setUploading] = useState(false);
  const [styles, setStyles] = useState<Style[]>([]);
  const [stylesLoading, setStylesLoading] = useState(true);

  // 从数据库加载风格列表
  useEffect(() => {
    fetch('/api/styles')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.styles?.length) {
          setStyles(data.data.styles);
          if (data.data.styles.length > 0 && !selectedStyle) {
            setSelectedStyle(data.data.styles[0].id);
          }
        }
      })
      .catch(() => {
        // fallback：使用默认列表
        setStyles([
          { id: 'pixar', name: '🎬 Pixar 3D 动画风', prompt: '' },
          { id: 'chinese', name: '🏮 国风', prompt: '' },
          { id: 'anime', name: '🌸 二次元', prompt: '' },
          { id: 'watercolor', name: '🎨 水彩', prompt: '' },
          { id: 'cyberpunk', name: '🌃 赛博朋克', prompt: '' },
        ]);
      })
      .finally(() => setStylesLoading(false));
  }, []);

  const processFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) { alert('仅支持 JPG、PNG、WEBP 格式'); return; }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) { alert('文件大小不能超过 ' + MAX_SIZE_MB + 'MB'); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) { alert('请先选择图片！'); return; }
    if (!childName.trim()) { alert('请输入小朋友的名字！'); return; }
    if (!projectName.trim()) { alert('请输入作品名称！'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('childName', childName.trim());
      formData.append('projectName', projectName.trim());
      formData.append('styleId', selectedStyle);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? '上传失败');

      setTimeout(() => router.push('/my-works'), 600);
    } catch (err: any) {
      alert('上传失败：' + err.message);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold text-center text-purple-600 mb-4">🎨 上传你的创意</h1>
        <p className="text-lg md:text-2xl text-center text-gray-600 mb-8 md:mb-12">上传你的创意绘画，让 AI 帮你变成动画！</p>

        <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-12 space-y-8 md:space-y-12">

          {/* 小朋友名字 */}
          <div>
            <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">👦 小朋友名字 <span className="text-red-500">*</span></label>
            <input type="text" value={childName} onChange={(e) => setChildName(e.target.value.slice(0, 20))}
              placeholder="请输入名字（最多20个字）" maxLength={20}
              className="w-full border-4 border-purple-300 rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xl md:text-2xl focus:border-purple-500 focus:outline-none" />
          </div>

          {/* 作品名称 */}
          <div>
            <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">📝 作品名称 <span className="text-red-500">*</span></label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value.slice(0, 50))}
              placeholder="请输入作品名称（最多50个字）" maxLength={50}
              className="w-full border-4 border-purple-300 rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xl md:text-2xl focus:border-purple-500 focus:outline-none" />
          </div>

          {/* 上传图片 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">📷 上传创意画</h2>
            <div className="border-4 border-dashed border-purple-300 rounded-3xl p-6 md:p-12 text-center cursor-pointer hover:border-purple-500"
              onClick={() => fileInputRef.current?.click()}>
              {previewUrl ? (
                <div>
                  <img src={previewUrl} alt="预览" className="max-w-full max-h-64 md:max-h-96 mx-auto rounded-2xl shadow-lg object-contain" />
                  <p className="text-gray-600 mt-3 text-lg">点击重新选择</p>
                </div>
              ) : (
                <div>
                  <div className="text-6xl md:text-8xl mb-4">📷</div>
                  <p className="text-xl text-gray-600">点击上传图片</p>
                  <p className="text-gray-400 mt-2 text-sm">支持 JPG、PNG、WEBP，最大 {MAX_SIZE_MB}MB</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(',')} onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} className="hidden" />
          </div>

          {/* 风格选择 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">🎨 选择风格</h2>
            {stylesLoading ? (
              <p className="text-gray-400 text-center py-4">加载中...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                {styles.map((s) => (
                  <div key={s.id} onClick={() => setSelectedStyle(s.id)}
                    className={'p-4 md:p-6 rounded-2xl border-4 cursor-pointer transition-all ' + (selectedStyle === s.id ? 'border-purple-500 bg-purple-50 scale-105' : 'border-gray-200 hover:border-purple-300')}>
                    <div className="text-lg md:text-2xl font-bold text-gray-800">{s.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 提交按钮 */}
          <div className="text-center">
            {uploading ? (
              <div>
                <p className="text-xl md:text-2xl text-purple-600 font-bold mb-4">正在上传...</p>
                <div className="text-5xl animate-bounce">⏳</div>
              </div>
            ) : (
              <KidButton onClick={handleUpload} disabled={!selectedFile}
                className="bg-gradient-to-r from-pink-400 to-purple-400 text-white text-xl md:text-3xl px-8 md:px-12 py-4 md:py-6 disabled:opacity-40 disabled:cursor-not-allowed">
                🚀 开始创作
              </KidButton>
            )}
          </div>
        </div>

        <div className="mt-6 md:mt-8 text-center">
          <Link href="/">
            <KidButton className="bg-gray-400 text-white text-sm md:text-base px-4 py-2 md:px-6 md:py-3">← 返回首页</KidButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
