'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import KidButton from '@/components/KidButton';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('pixar');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // 风格选项
  const styles = [
    { id: 'pixar',     name: '🎬 Pixar 3D',   description: '迪士尼皮克斯风格' },
    { id: 'guofeng',    name: '🏮 国风',          description: '中国古风' },
    { id: 'anime',      name: '🌸 二次元',        description: '日本动漫风格' },
    { id: 'watercolor', name: '🎨 水彩',          description: '水彩画风格' },
    { id: 'cyberpunk', name: '🌃 赛博朋克',     description: '未来科幻风格' },
  ];

  // 统一处理文件
  const processFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('❌ 只支持 JPG、JPEG、PNG 格式');
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('❌ 文件大小不能超过 10MB');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // 相册选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // 拍照
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // 处理上传（上传 → 触发 AI 故事生成）
  const handleUpload = async () => {
    if (!selectedFile) { alert('请先选择一张图片！'); return; }
    if (!childName.trim()) { alert('请填写小朋友的名字！'); return; }

    setIsUploading(true);
    setUploadProgress('📤 正在上传图片...');

    try {
      const userId = crypto.randomUUID();

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', userId);
      formData.append('childName', childName.trim());
      formData.append('style', selectedStyle);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) throw new Error(uploadData.error || '上传失败');

      const { projectId, originalImageUrl } = uploadData.data;
      setUploadProgress('✅ 上传成功！正在生成故事...');

      // 触发 AI 故事生成（视觉理解 → 生成故事）
      const storyRes = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, imageUrl: originalImageUrl, style: selectedStyle }),
      });
      const storyData = await storyRes.json();

      if (!storyData.success) {
        console.warn('⚠️ 故事生成失败，但项目已创建:', storyData.error);
        // 故事生成失败也跳转到详情页（可以稍后重试）
      } else {
        setUploadProgress('✅ 故事生成成功！正在生成分镜图...');
        // 自动触发图片生成
        const genImgRes = await fetch('/api/generate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, prompts: storyData.data.prompts, style: selectedStyle }),
        });
        if (!genImgRes.ok) console.warn('⚠️ 图片生成请求失败');
      }

      // 跳转到项目详情页
      setTimeout(() => router.push(`/projects/${projectId}`), 500);
    } catch (error: any) {
      console.error('上传失败:', error);
      alert(`❌ 上传失败: ${error.message}`);
      setIsUploading(false);
      setUploadProgress('');
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

        <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-12">
          {/* 小朋友名字 */}
          <div className="mb-6 md:mb-8">
            <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-2 md:mb-3">
              👧 小朋友的名字 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="请输入小朋友的名字"
              maxLength={20}
              className="w-full border-4 border-purple-300 rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xl md:text-2xl focus:border-purple-500 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* 文件上传区域 */}
          <div className="mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">
              📸 上传你的绘画
            </h2>

            <div
              className="border-4 border-dashed border-purple-300 rounded-3xl p-6 md:p-12 text-center cursor-pointer hover:border-purple-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div>
                  <img
                    src={previewUrl}
                    alt="预览"
                    className="max-w-full max-h-64 md:max-h-96 mx-auto rounded-2xl shadow-lg object-contain"
                  />
                  <p className="text-gray-600 mt-2 md:mt-4 text-lg md:text-xl">
                    点击重新选择
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-6xl md:text-8xl mb-2 md:mb-4">📷</div>
                  <p className="text-xl md:text-2xl text-gray-600">
                    点击这里上传图片
                  </p>
                  <p className="text-gray-400 mt-1 md:mt-2 text-sm md:text-base">
                    支持 JPG、PNG 格式，最大 10MB
                  </p>
                </div>
              )}
            </div>

            {/* 按钮组：相册 + 拍照 */}
            <div className="flex gap-3 mt-3 md:mt-4 justify-center">
              <KidButton
                onClick={() => fileInputRef.current?.click()}
                className="bg-purple-200 text-purple-800 px-4 md:px-6 py-2 text-sm md:text-base"
              >
                📁 相册选择
              </KidButton>
              <KidButton
                onClick={() => cameraInputRef.current?.click()}
                className="bg-blue-200 text-blue-800 px-4 md:px-6 py-2 text-sm md:text-base"
              >
                📷 拍照
              </KidButton>
            </div>

            {/* 相册 input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleFileSelect}
              className="hidden"
            />
            {/* 拍照 input（mobile 触发摄像头） */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
          </div>

          {/* 风格选择 */}
          <div className="mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">
              🎨 选择你喜欢的风格
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {styles.map((style) => (
                <div
                  key={style.id}
                  className={`p-4 md:p-6 rounded-2xl border-4 cursor-pointer transition-all ${
                    selectedStyle === style.id
                      ? 'border-purple-500 bg-purple-50 scale-105'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => setSelectedStyle(style.id)}
                >
                  <div className="text-lg md:text-2xl font-bold text-gray-800">
                    {style.name}
                  </div>
                  <div className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                    {style.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 上传按钮 */}
          <div className="text-center">
            {isUploading ? (
              <div>
                <div className="text-lg md:text-2xl text-purple-600 mb-2 md:mb-4">
                  {uploadProgress}
                </div>
                <div className="animate-spin text-4xl md:text-6xl">⏳</div>
              </div>
            ) : (
              <KidButton
                onClick={handleUpload}
                className="bg-gradient-to-r from-pink-400 to-purple-400 text-white text-xl md:text-3xl px-8 md:px-12 py-4 md:py-6"
                disabled={!selectedFile}
              >
                🚀 开始创作
              </KidButton>
            )}
          </div>
        </div>

        {/* 返回按钮 */}
        <div className="mt-6 md:mt-8 text-center">
          <Link href="/">
            <KidButton className="bg-gray-400 text-white text-sm md:text-base px-4 py-2 md:px-6 md:py-3">
              ← 返回首页
            </KidButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
