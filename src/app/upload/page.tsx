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

interface SelectedStudent {
  id: string;
  student_code: string;
  name: string;
  institution: string;
  activity_date: string;
  session_number: number;
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
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);
  const [redirecting, setRedirecting] = useState(true);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('selected_student');
    if (!stored) {
      router.replace('/select-student');
      return;
    }
    const student: SelectedStudent = JSON.parse(stored);
    setSelectedStudent(student);
    setChildName(student.name);
    setRedirecting(false);
  }, [router]);

  useEffect(() => {
    fetch('/api/styles')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.styles?.length) {
          setStyles(data.data.styles);
          const hasPixar = data.data.styles.find((s: any) => s.id === 'pixar');
          setSelectedStyle(hasPixar ? 'pixar' : data.data.styles[0].id);
        }
      })
      .catch(() => {
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
    if (!selectedStudent) { alert('请先选择学生身份'); router.push('/select-student'); return; }

    setUploading(true);
    try {
      // 1. 先创建项目记录（不带上传图片URL），拿到 projectId
      const createFormData = new FormData();
      createFormData.append('childName', childName.trim());
      createFormData.append('projectName', projectName.trim());
      createFormData.append('styleId', selectedStyle);
      createFormData.append('userId', selectedStudent.id);

      const createRes = await fetch('/api/upload', { method: 'POST', body: createFormData, signal: AbortSignal.timeout(25000) });
      const createData = await createRes.json();
      if (!createData.success) throw new Error(createData.error ?? '创建项目失败');

      const projectId = createData.data.projectId;

      // 2. 获取七牛上传凭证（用 projectId 构造正确的文件名）
      const tokenRes = await fetch(`/api/upload?projectId=${projectId}&userId=${selectedStudent.id}&childName=${encodeURIComponent(childName.trim())}&projectName=${encodeURIComponent(projectName.trim())}&styleId=${selectedStyle}`);
      const tokenData = await tokenRes.json();
      if (!tokenData.success) throw new Error(tokenData.error ?? '获取上传凭证失败');

      const { token, key, uploadUrl, publicUrl } = tokenData.data;

      // 3. 前端直传七牛云
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('token', token);
      uploadFormData.append('key', key);

      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: uploadFormData });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '上传失败');
        throw new Error('图片上传失败：' + errText);
      }

      // 4. 更新项目记录的图片URL
      const updateRes = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_image_url: publicUrl }),
        signal: AbortSignal.timeout(15000),
      });
      const updateData = await updateRes.json();
      if (!updateData.success) throw new Error(updateData.error ?? '更新图片URL失败');

      setUploading(false);
      setUploadSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      alert('上传失败：' + err.message);
      setUploading(false);
    }
  };

  if (redirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100">
        <div className="text-6xl animate-bounce mb-4">🎒</div>
        <p className="text-2xl text-purple-600 font-bold">准备中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold text-center text-purple-600 mb-4">🎨 上传你的创意</h1>
        <p className="text-lg md:text-2xl text-center text-gray-600 mb-8">上传你的创意绘画，让 AI 帮你变成动画！</p>

        {selectedStudent && (
          <div className="bg-purple-100 border-2 border-purple-300 rounded-2xl p-3 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👦</span>
              <div>
                <p className="font-bold text-purple-700">{selectedStudent.name}</p>
                <p className="text-purple-400 text-xs">{selectedStudent.institution}</p>
              </div>
            </div>
            <button onClick={() => router.push('/select-student')}
              className="px-3 py-1 bg-white rounded-xl text-purple-600 text-sm font-bold hover:bg-purple-50">
              切换
            </button>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-12 space-y-8">

          <div>
            <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">📝 作品名称 <span className="text-red-500">*</span></label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value.slice(0, 50))}
              placeholder="请输入作品名称（最多50个字）" maxLength={50}
              className="w-full border-4 border-purple-300 rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xl md:text-2xl focus:border-purple-500 focus:outline-none" />
          </div>

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

          <div className="text-center">
            {uploading ? (
              <div>
                <p className="text-xl md:text-2xl text-purple-600 font-bold mb-4">正在上传...</p>
                <div className="text-5xl animate-bounce">⏳</div>
              </div>
            ) : uploadSuccess ? (
              <div className="bg-green-100 border-4 border-green-400 rounded-3xl p-8 text-center">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-2xl font-bold text-green-700 mb-2">上传成功！</p>
                <p className="text-green-600">作品正在处理中，请耐心等待~</p>
                <p className="text-green-500 mt-4 animate-pulse">即将返回首页...</p>
              </div>
            ) : (
              <KidButton onClick={handleUpload} disabled={!selectedFile}
                className="bg-gradient-to-r from-pink-400 to-purple-400 text-white text-xl md:text-3xl px-8 md:px-12 py-4 md:py-6 disabled:opacity-40 disabled:cursor-not-allowed">
                🚀 开始创作
              </KidButton>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/">
            <KidButton className="bg-gray-400 text-white text-sm px-4 py-2 md:px-6 md:py-3">← 返回首页</KidButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
