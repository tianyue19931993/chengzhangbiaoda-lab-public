import { NextResponse } from 'next/server';

/**
 * GET /api/config
 * 检查哪些 API 已配置
 */
export async function GET() {
  const hasDoubaoApi = !!process.env.DOUBAO_API_KEY;
  return NextResponse.json({
    success: true,
    data: {
      hasDoubaoApi,
      hasAnyApi: hasDoubaoApi,
    },
  });
}
