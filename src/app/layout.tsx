import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: '成长表达实验室 D',
  description: '创意不设限，快来把想法变成动态惊喜吧～',
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
