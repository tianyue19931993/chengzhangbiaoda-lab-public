import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: '成长表达实验室',
  description: '让孩子的创意变成动画',
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
