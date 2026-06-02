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

    // 先单独查项目主表（确保一定能拿到）
    const { data: projectRow, error: projErr } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (projErr || !projectRow) {
      return NextResponse.json({ 
        success: false, 
        error: `项目不存在 | debug: ${String(projErr ?? '')}` 
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

    // 如果有关联 story_id，查询 stories 表获取正文
    let storyContent = projectRow.story;
    if (projectRow.story_id) {
      const { data: storyRow } = await supabaseAdmin
        .from('stories')
        .select('content')
        .eq('id', projectRow.story_id)
        .maybeSingle();
      if (storyRow) storyContent = storyRow.content;
    }
    (project as any).story_content = storyContent;

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

    const { title, story_content, style_id, hero_design, status } = body;
    const updates: Record<string, any> = {};

    if (title       !== undefined) updates.title       = title;
    if (style_id    !== undefined) updates.style_id    = style_id;
    if (status      !== undefined) updates.status      = status;

    // 更新 projects 表
    if (Object.keys(updates).length > 0) {
      const { error: projErr } = await supabaseAdmin
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (projErr) return NextResponse.json({ success: false, error: projErr.message }, { status: 500 });
    }

    // 更新 stories 表（如果传了 story_content）
    if (story_content !== undefined) {
      let storyId = (await supabaseAdmin.from('projects').select('story_id').eq('id', id).single())?.data?.story_id;

      if (storyId) {
        // 已有 story 记录，更新
        await supabaseAdmin.from('stories').update({ content: story_content }).eq('id', storyId);
      } else {
        // 新建 story 记录
        const { data: newStory } = await supabaseAdmin.from('stories').insert({
          project_id: id,
          content: story_content,
          title: title ?? '未命名故事',
        }).select('id').single();
        if (newStory?.id) {
          await supabaseAdmin.from('projects').update({ story_id: newStory.id }).eq('id', id);
        }
      }
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
      .select('*')
      .eq('id', id)
      .single();

    let finalStory = project?.story;
    if (project?.story_id) {
      const { data: sr } = await supabaseAdmin.from('stories').select('content').eq('id', project.story_id).maybeSingle();
      if (sr) finalStory = sr.content;
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        project: { 
          ...project, 
          hero_designs: (await supabaseAdmin.from('hero_designs').select('*').eq('project_id', id).maybeSingle()).data ?? null,
          storyboard_items: (await supabaseAdmin.from('storyboard_items').select('*').eq('project_id', id).order('sort_order', { ascending: true })).data ?? [],
          videos: (await supabaseAdmin.from('videos').select('*').eq('project_id', id).maybeSingle()).data ?? null,
          ...(finalStory !== undefined && { _story_content: finalStory }),
        } 
      } 
    });
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
