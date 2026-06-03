import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/projects?status=xxx&limit=20&offset=0
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const limit  = parseInt(searchParams.get('limit')  ?? '20');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    let query = supabaseAdmin
      .from('projects')
      .select('*, styles(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (userId) query = query.eq('user_id', userId);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    const projects = (data ?? []).map((p: any) => ({
      ...p,
      style_name: p.styles?.name ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: { projects, total: count ?? 0, limit, offset },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/projects
export async function POST(request: NextRequest) {
  try {
    const { child_name, project_name, style_id, original_image_url } = await request.json();

    if (!child_name || !project_name || !original_image_url) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: child_name, project_name, original_image_url' },
        { status: 400 }
      );
    }

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        child_name,
        project_name,
        style_id: style_id ?? 'pixar',
        original_image_url,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data: { project } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
