import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'MR 研学馆 - 儿童 AI 创意动画平台',
  description: '让孩子的新意变成动画',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100">
          {children}
        </main>
      </body>
    </html>
  );
}
