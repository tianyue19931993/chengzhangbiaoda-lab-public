import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/download/[id] - 代理下载视频文件（触发微信文件接收界面）
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. 从数据库获取视频 URL
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('video_url, user_name')
      .eq('id', id)
      .single();

    if (error || !project?.video_url) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    // 2. 服务端 fetch 视频文件
    const videoRes = await fetch(project.video_url);
    
    if (!videoRes.ok || !videoRes.body) {
      return NextResponse.json({ success: false, error: 'Failed to fetch video' }, { status: 500 });
    }

    // 3. 构建文件名
    const safeName = (project.user_name || '作品').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_]/g, '_');
    const filename = `成长表达_${safeName}.mp4`;

    // 4. 返回文件流，设置 attachment 头（关键！这会触发微信的文件接收界面）
    return new NextResponse(videoRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': videoRes.headers.get('Content-Length') || '',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
