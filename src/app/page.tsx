import KidButton from '@/components/KidButton';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-6xl font-bold text-purple-600 mb-8 animate-bounce">
        🎨 MR 研学馆 🎬
      </h1>
      <p className="text-2xl text-gray-700 mb-12 text-center">
        上传你的创意，让 AI 帮你变成动画！
      </p>
      
      <div className="space-y-6">
        <KidButton 
          href="/upload"
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
      </div>
    </div>
  );
}
