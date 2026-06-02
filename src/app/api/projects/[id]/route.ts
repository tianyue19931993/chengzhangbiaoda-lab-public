import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET  /api/projects/[id]  → 项目详情
// PATCH /api/projects/[id]  → 更新项目
// DELETE /api/projects/[id] → 删除项目

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ── DEBUG: 先简单查询，看看到底什么情况 ──
    const { data: allProjects, error: listErr } = await supabaseAdmin
      .from('projects')
      .select('id, status, created_at')
      .limit(5);

    console.log('🔍 [DEBUG] 所有项目:', JSON.stringify(allProjects));
    console.log('🔍 [DEBUG] listErr:', JSON.stringify(listErr));
    console.log('🔍 [DEBUG] 查询的 id:', id);

    // 先单独查项目主表（确保一定能拿到）
    const { data: projectRow, error: projErr } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    console.log('🔍 [DEBUG] projectRow:', JSON.stringify(projectRow));
    console.log('🔍 [DEBUG] projErr:', JSON.stringify(projErr));

    if (projErr || !projectRow) {
      return NextResponse.json({ 
        success: false, 
        error: `项目不存在 | debug: ${projErr?.message}` 
      }, { status: 404 });
    }

    // 并行查询关联子表（容错：子表没数据不阻塞）
    const [heroRes, storyRes, videoRes] = await Promise.all([
      supabaseAdmin.from('hero_designs').select('*').eq('project_id', id).maybeSingle(),
      supabaseAdmin.from('storyboard_items').select('*').eq('project_id', id).order('sort_order', { ascending: true }),
      supabaseAdmin.from('videos').select('*').eq('project_id', id).maybeSingle(),
    ]);

    const project = {
      ...projectRow,
      hero_designs: heroRes.data ?? null,
      storyboard_items: storyRes.data ?? [],
      videos: videoRes.data ?? null,
    };

    console.log('🔍 [DEBUG] projectRow:', JSON.stringify(projectRow));
    console.log('🔍 [DEBUG] projErr:', JSON.stringify(projErr));
    console.log('🔍 [DEBUG] hero_designs:', JSON.stringify(heroRes.data));
    console.log('🔍 [DEBUG] storyboard_items count:', storyRes.data?.length);
    console.log('🔍 [DEBUG] videos:', JSON.stringify(videoRes.data));

    if (error || !project) {
      return NextResponse.json({ 
        success: false, 
        error: `项目不存在 | debug: listErr=${listErr?.message}, projectCount=${allProjects?.length ?? 0}` 
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { project } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { title, story, style_id, hero_design, status } = body;
    const updates: Record<string, any> = {};

    if (title      !== undefined) updates.title      = title;
    if (story      !== undefined) updates.story      = story;
    if (style_id   !== undefined) updates.style_id   = style_id;
    if (status     !== undefined) updates.status     = status;

    // 更新 projects 表
    if (Object.keys(updates).length > 0) {
      const { error: projErr } = await supabaseAdmin
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (projErr) return NextResponse.json({ success: false, error: projErr.message }, { status: 500 });
    }

    // 更新 hero_designs 表（upsert）
    if (hero_design) {
      const hd = typeof hero_design === 'string' ? JSON.parse(hero_design) : hero_design;
      const { error: heroErr } = await supabaseAdmin
        .from('hero_designs')
        .upsert({ project_id: id, ...hd }, { onConflict: 'project_id' });

      if (heroErr) console.error('⚠️ hero_design 更新失败:', heroErr);
    }

    // 重新查询完整数据返回
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        hero_designs(*),
        storyboard_items(* order by sort_order),
        videos(*)
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({ success: true, data: { project } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin.from('projects').delete().eq('id', id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data: { message: '项目已删除' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
