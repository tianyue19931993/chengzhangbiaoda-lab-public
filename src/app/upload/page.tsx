'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import KidButton from '@/components/KidButton';

// 风格选项（与 /prompts/styles.ts 保持同步）
const STYLES = [
  { id: 'pixar',     name: '🎬 Pixar 3D 动画风', description: '迪士尼皮克斯风格，色彩明亮可爱' },
  { id: 'chinese',   name: '🏮 国风',             description: '中国古风，水墨画质感' },
  { id: 'anime',     name: '🌸 二次元',           description: '日式动漫风格，宫崎骏风格' },
  { id: 'watercolor',name: '🎨 水彩',             description: '水彩画风格，透明柔和' },
  { id: 'cyberpunk', name: '🌃 赛博朋克',         description: '未来科幻，霓虹灯光' },
];

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB    = 10;

export default function UploadPage() {
  const router         = useRouter();
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile,  setSelectedFile]  = useState<File | null>(null);
  const [previewUrl,    setPreviewUrl]   = useState<string | null>(null);
  const [childName,     setChildName]     = useState('');
  const [selectedStyle, setSelectedStyle] = useState('pixar');
  const [uploading,     setUploading]     = useState(false);
  const [progress,      setProgress]      = useState('');

  const processFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert('❌ 只支持 JPG、PNG、WEBP 格式'); return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`❌ 文件大小不能超过 ${MAX_SIZE_MB}MB`); return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) processFile(f);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) processFile(f);
  };

  const handleUpload = async () => {
    if (!selectedFile) { alert('请先选择一张图片！'); return; }
    if (!childName.trim()) { alert('请填写小朋友的名字！'); return; }

    setUploading(true);
    setProgress('📤 正在上传图片...');

    try {
      const userId = crypto.randomUUID();
      const formData = new FormData();
      formData.append('file',      selectedFile);
      formData.append('userId',    userId);
      formData.append('childName', childName.trim());
      formData.append('style',     selectedStyle); // style_id

      const res  = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!data.success) throw new Error(data.error ?? '上传失败');

      setProgress('✅ 上传成功！AI 正在生成故事...');

      // 跳转到详情页（故事生成在后台进行）
      setTimeout(() => router.push(`/projects/${data.data.projectId}`), 600);
    } catch (err: any) {
      alert(`❌ 上传失败: ${err.message}`);
      setUploading(false);
      setProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* 标题 */}
        <h1 className="text-3xl md:text-5xl font-bold text-center text-purple-600 mb-4">
          🎨 上传你的创意
        </h1>
        <p className="text-lg md:text-2xl text-center text-gray-600 mb-8 md:mb-12">
          上传你的绘画，让 AI 帮你变成动画！
        </p>

        <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-12 space-y-8 md:space-y-12">

          {/* ── 小朋友名字 ────────────────────────────── */}
          <div>
            <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">
              👧 小朋友名字a298659<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value.slice(0, 20))}
              placeholder="请输入小朋友的名字（最多20字）"
              maxLength={20}
              className="w-full border-4 border-purple-300 rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xl md:text-2xl focus:border-purple-500 focus:outline-none transition-colors"
            />
          </div>

          {/* ── 上传图片 ──────────────────────────────── */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">📸 上传你的绘画</h2>

            <div
              className="border-4 border-dashed border-purple-300 rounded-3xl p-6 md:p-12 text-center cursor-pointer hover:border-purple-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div>
                  <img src={previewUrl} alt="预览" className="max-w-full max-h-64 md:max-h-96 mx-auto rounded-2xl shadow-lg object-contain" />
                  <p className="text-gray-600 mt-3 text-lg">点击重新选择</p>
                </div>
              ) : (
                <div>
                  <div className="text-6xl md:text-8xl mb-4">📷</div>
                  <p className="text-xl text-gray-600">点击这里上传图片</p>
                  <p className="text-gray-400 mt-2 text-sm">支持 JPG、PNG、WEBP 格式，最大 {MAX_SIZE_MB}MB</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4 justify-center">
              <KidButton
                onClick={() => fileInputRef.current?.click()}
                className="bg-purple-200 text-purple-800 px-4 md:px-6 py-2 text-sm md:text-base"
              >📁 相册选择</KidButton>
              <KidButton
                onClick={() => cameraInputRef.current?.click()}
                className="bg-blue-200 text-blue-800 px-4 md:px-6 py-2 text-sm md:text-base"
              >📷 拍照</KidButton>
            </div>

            <input ref={fileInputRef}   type="file" accept={ACCEPTED_TYPES.join(',')}               onChange={handleFileSelect} className="hidden" />
            <input ref={cameraInputRef} type="file" accept={ACCEPTED_TYPES.join(',')} capture="environment" onChange={handleCameraCapture} className="hidden" />
          </div>

          {/* ── 风格选择 ──────────────────────────────── */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">🎨 选择你喜欢的风格</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {STYLES.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStyle(s.id)}
                  className={`p-4 md:p-6 rounded-2xl border-4 cursor-pointer transition-all ${
                    selectedStyle === s.id
                      ? 'border-purple-500 bg-purple-50 scale-105'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="text-lg md:text-2xl font-bold text-gray-800">{s.name}</div>
                  <div className="text-gray-600 mt-1 text-sm md:text-base">{s.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 开始创作按钮 ──────────────────────────── */}
          <div className="text-center">
            {uploading ? (
              <div>
                <p className="text-xl md:text-2xl text-purple-600 font-bold mb-4">{progress}</p>
                <div className="text-5xl animate-bounce">⏳</div>
              </div>
            ) : (
              <KidButton
                onClick={handleUpload}
                disabled={!selectedFile}
                className="bg-gradient-to-r from-pink-400 to-purple-400 text-white text-xl md:text-3xl px-8 md:px-12 py-4 md:py-6 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🚀 开始创作
              </KidButton>
            )}
          </div>
        </div>

        {/* 返回 */}
        <div className="mt-6 md:mt-8 text-center">
          <Link href="/">
            <KidButton className="bg-gray-400 text-white text-sm md:text-base px-4 py-2 md:px-6 md:py-3">← 返回首页</KidButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
