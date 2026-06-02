import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET  /api/projects?userId=xxx → 项目列表
// POST /api/projects          → 创建项目

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit  = parseInt(searchParams.get('limit')  ?? '20');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    if (!userId) return NextResponse.json({ success: false, error: '缺少 userId' }, { status: 400 });

    // 先查主表（避免联合查询子表无数据时报错）
    const { data: projects, error, count } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      data:   { projects: projects ?? [], total: count ?? 0, limit, offset },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, childName, styleId } = await request.json();
    if (!userId) return NextResponse.json({ success: false, error: '缺少 userId' }, { status: 400 });

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        user_id:    userId,
        child_name: childName ?? '小朋友',
        style_id:   styleId   ?? 'pixar',
        status:     'drafting',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data: { project } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
