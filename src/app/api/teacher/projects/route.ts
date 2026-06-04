import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/teacher/projects - all projects for teacher dashboard
export async function GET() {
  try {
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*, styles(name)')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const result = (projects ?? []).map((p: any) => {
      // 自动判断状态：基于 URL 存在性
      let autoStatus = p.status;
      const hasStoryboard = !!p.storyboard_image_url;
      const hasVideo = !!p.video_url;
      
      if (hasStoryboard && hasVideo) {
        autoStatus = 'completed';
      } else if (hasStoryboard || hasVideo) {
        autoStatus = 'processing';
      } else {
        autoStatus = 'pending';
      }
      
      // 保留 failed 状态
      if (p.status === 'failed') {
        autoStatus = 'failed';
      }
      
      return {
        ...p,
        status: autoStatus,
        style_name: p.styles?.name ?? null,
      };
    });

    return NextResponse.json({ success: true, data: { projects: result } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
