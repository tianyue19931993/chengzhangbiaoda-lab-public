import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/teacher/projects
 * 获取所有作品（老师端专用）
 */
export async function GET(request: NextRequest) {
  try {
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        stories(*),
        hero_designs(*),
        storyboard_items(*),
        videos(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 查询失败:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { projects: projects || [] },
    });
  } catch (err: any) {
    console.error('❌ 获取全量作品异常:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
