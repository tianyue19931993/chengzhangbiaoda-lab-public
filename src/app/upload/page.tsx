'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import KidButton from '@/components/KidButton';

const STYLES = [
  { id: 'pixar',     name: 'Pixar 3D',       description: 'Bright Disney Pixar style' },
  { id: 'chinese',   name: 'Chinese',         description: 'Traditional Chinese ink painting' },
  { id: 'anime',     name: 'Anime',           description: 'Japanese anime style' },
  { id: 'watercolor',name: 'Watercolor',      description: 'Soft watercolor painting' },
  { id: 'cyberpunk', name: 'Cyberpunk',       description: 'Futuristic neon lights' },
];

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('pixar');
  const [uploading, setUploading] = useState(false);

  const processFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) { alert('Only JPG, PNG, WEBP'); return; }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) { alert('Max ' + MAX_SIZE_MB + 'MB'); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) { alert('Please select an image!'); return; }
    if (!childName.trim()) { alert('Please enter child name!'); return; }
    if (!projectName.trim()) { alert('Please enter project name!'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('childName', childName.trim());
      formData.append('projectName', projectName.trim());
      formData.append('styleId', selectedStyle);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Upload failed');

      setTimeout(() => router.push('/my-works'), 600);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold text-center text-purple-600 mb-4">\ud83c\udfa8 Upload Your Creation</h1>
        <p className="text-lg md:text-2xl text-center text-gray-600 mb-8 md:mb-12">Upload your drawing and let us turn it into animation!</p>

        <div className="bg-white rounded-3xl shadow-2xl p-4 md:p-12 space-y-8 md:space-y-12">

          {/* Child Name */}
          <div>
            <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">\ud83d\udc67 Child Name <span className="text-red-500">*</span></label>
            <input type="text" value={childName} onChange={(e) => setChildName(e.target.value.slice(0, 20))}
              placeholder="Enter child name (max 20 chars)" maxLength={20}
              className="w-full border-4 border-purple-300 rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xl md:text-2xl focus:border-purple-500 focus:outline-none" />
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">\ud83d\udcdc Project Name <span className="text-red-500">*</span></label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value.slice(0, 50))}
              placeholder="Enter project name (max 50 chars)" maxLength={50}
              className="w-full border-4 border-purple-300 rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xl md:text-2xl focus:border-purple-500 focus:outline-none" />
          </div>

          {/* File Upload */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">\ud83d\udcf8 Upload Drawing</h2>
            <div className="border-4 border-dashed border-purple-300 rounded-3xl p-6 md:p-12 text-center cursor-pointer hover:border-purple-500"
              onClick={() => fileInputRef.current?.click()}>
              {previewUrl ? (
                <div>
                  <img src={previewUrl} alt="Preview" className="max-w-full max-h-64 md:max-h-96 mx-auto rounded-2xl shadow-lg object-contain" />
                  <p className="text-gray-600 mt-3 text-lg">Click to re-select</p>
                </div>
              ) : (
                <div>
                  <div className="text-6xl md:text-8xl mb-4">\ud83d\udcf7</div>
                  <p className="text-xl text-gray-600">Click to upload image</p>
                  <p className="text-gray-400 mt-2 text-sm">JPG, PNG, WEBP, max {MAX_SIZE_MB}MB</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4 justify-center">
              <KidButton onClick={() => fileInputRef.current?.click()} className="bg-purple-200 text-purple-800 px-4 md:px-6 py-2 text-sm md:text-base">Album</KidButton>
              <KidButton onClick={() => cameraInputRef.current?.click()} className="bg-blue-200 text-blue-800 px-4 md:px-6 py-2 text-sm md:text-base">Camera</KidButton>
            </div>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(',')} onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} className="hidden" />
            <input ref={cameraInputRef} type="file" accept={ACCEPTED_TYPES.join(',')} capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} className="hidden" />
          </div>

          {/* Style Selection */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">\ud83c\udfa8 Choose Style</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {STYLES.map((s) => (
                <div key={s.id} onClick={() => setSelectedStyle(s.id)}
                  className={'p-4 md:p-6 rounded-2xl border-4 cursor-pointer transition-all ' + (selectedStyle === s.id ? 'border-purple-500 bg-purple-50 scale-105' : 'border-gray-200 hover:border-purple-300')}>
                  <div className="text-lg md:text-2xl font-bold text-gray-800">{s.name}</div>
                  <div className="text-gray-600 mt-1 text-sm md:text-base">{s.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="text-center">
            {uploading ? (
              <div>
                <p className="text-xl md:text-2xl text-purple-600 font-bold mb-4">Uploading...</p>
                <div className="text-5xl animate-bounce">\u23f3</div>
              </div>
            ) : (
              <KidButton onClick={handleUpload} disabled={!selectedFile}
                className="bg-gradient-to-r from-pink-400 to-purple-400 text-white text-xl md:text-3xl px-8 md:px-12 py-4 md:py-6 disabled:opacity-40 disabled:cursor-not-allowed">
                \ud83d\ude80 Start Creating
              </KidButton>
            )}
          </div>
        </div>

        <div className="mt-6 md:mt-8 text-center">
          <Link href="/">
            <KidButton className="bg-gray-400 text-white text-sm md:text-base px-4 py-2 md:px-6 md:py-3">\u2190 Home</KidButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
