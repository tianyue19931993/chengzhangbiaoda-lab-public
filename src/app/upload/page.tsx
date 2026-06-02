'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import KidButton from '@/components/KidButton';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('pixar');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  
  // 风格选项
  const styles = [
    { id: 'pixar', name: '🎬 Pixar 3D', description: '迪士尼皮克斯风格' },
    { id: 'guofeng', name: '🏮 国风', description: '中国古风' },
    { id: 'anime', name: '🌸 二次元', description: '日本动漫风格' },
    { id: 'watercolor', name: '🎨 水彩', description: '水彩画风格' },
    { id: 'cyberpunk', name: '🌃 赛博朋克', description: '未来科幻风格' },
  ];
  
  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('❌ 只支持 JPG、JPEG、PNG 格式');
      return;
    }
    
    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('❌ 文件大小不能超过 10MB');
      return;
    }
    
    setSelectedFile(file);
    
    // 生成预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // 处理上传
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('请先选择一张图片！');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress('📤 正在上传图片...');
    
    try {
      // 模拟用户 ID（实际应该从登录系统获取）
      const userId = crypto.randomUUID();
      
      // 上传文件
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', userId);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const uploadData = await uploadRes.json();
      
      if (!uploadData.success) {
        throw new Error(uploadData.error || '上传失败');
      }
      
      const { projectId, imageUrl } = uploadData.data;
      setUploadProgress('🤖 AI 正在理解你的创意...');
      
      // 调用豆包生成故事
      const storyRes = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          imageUrl,
          style: selectedStyle,
        }),
      });
      
      const storyData = await storyRes.json();
      
      if (!storyData.success) {
        throw new Error(storyData.error || '故事生成失败');
      }
      
      setUploadProgress('✅ 故事生成完成！');
      
      // 跳转到项目详情页
      setTimeout(() => {
        router.push(`/projects/${projectId}`);
      }, 1000);
    } catch (error: any) {
      console.error('上传失败:', error);
      alert(`❌ 上传失败: ${error.message}`);
      setIsUploading(false);
      setUploadProgress('');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <h1 className="text-5xl font-bold text-center text-purple-600 mb-4">
          🎨 上传你的创意
        </h1>
        <p className="text-2xl text-center text-gray-600 mb-12">
          上传你的绘画，让 AI 帮你变成动画！
        </p>
        
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* 文件上传区域 */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              📸 上传你的绘画
            </h2>
            
            <div
              className="border-4 border-dashed border-purple-300 rounded-3xl p-12 text-center cursor-pointer hover:border-purple-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div>
                  <img
                    src={previewUrl}
                    alt="预览"
                    className="max-w-full max-h-96 mx-auto rounded-2xl shadow-lg"
                  />
                  <p className="text-gray-600 mt-4 text-xl">
                    点击重新选择
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-8xl mb-4">📷</div>
                  <p className="text-2xl text-gray-600">
                    点击这里上传图片
                  </p>
                  <p className="text-gray-400 mt-2">
                    支持 JPG、PNG 格式，最大 10MB
                  </p>
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          {/* 风格选择 */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              🎨 选择你喜欢的风格
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {styles.map((style) => (
                <div
                  key={style.id}
                  className={`p-6 rounded-2xl border-4 cursor-pointer transition-all ${
                    selectedStyle === style.id
                      ? 'border-purple-500 bg-purple-50 scale-105'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => setSelectedStyle(style.id)}
                >
                  <div className="text-2xl font-bold text-gray-800">
                    {style.name}
                  </div>
                  <div className="text-gray-600 mt-2">
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
                <div className="text-2xl text-purple-600 mb-4">
                  {uploadProgress}
                </div>
                <div className="animate-spin text-6xl">⏳</div>
              </div>
            ) : (
              <KidButton
                onClick={handleUpload}
                className="bg-gradient-to-r from-pink-400 to-purple-400 text-white text-3xl px-12 py-6"
                disabled={!selectedFile}
              >
                🚀 开始创作
              </KidButton>
            )}
          </div>
        </div>
        
        {/* 返回按钮 */}
        <div className="mt-8 text-center">
          <Link href="/">
            <KidButton className="bg-gray-400 text-white">
              ← 返回首页
            </KidButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
