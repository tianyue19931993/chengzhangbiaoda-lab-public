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

    // 子表无数据时，回退读取 is_default=true 的默认值
    let heroData = heroRes.data;
    if (!heroData) {
      const { data: defaultHero } = await supabaseAdmin
        .from('hero_designs')
        .select('*')
        .eq('is_default', true)
        .maybeSingle();
      if (defaultHero) heroData = defaultHero;
    }

    let storyContent = projectRow.story;
    // 优先从 story_id 关联查
    if (projectRow.story_id) {
      const { data: storyRow } = await supabaseAdmin
        .from('stories')
        .select('content')
        .eq('id', projectRow.story_id)
        .maybeSingle();
      if (storyRow) storyContent = storyRow.content;
    }
    // 如果还没有内容，读默认故事
    if (!storyContent) {
      const { data: defaultStory } = await supabaseAdmin
        .from('stories')
        .select('content')
        .eq('is_default', true)
        .maybeSingle();
      if (defaultStory) storyContent = defaultStory.content;
    }

    const project = {
      ...projectRow,
      hero_designs: heroData ?? null,
      storyboard_items: storyRes.data ?? [],
      videos: videoRes.data ?? null,
      story_content: storyContent,
    };

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

    const { title, story_content, story, style_id, hero_designs, status } = body;
    const updates: Record<string, any> = {};

    if (title       !== undefined) updates.title       = title;
    if (style_id    !== undefined) updates.style_id    = style_id;
    if (status      !== undefined) updates.status      = status;
    // 兼容 story 或 story_content
    const finalStory = story_content !== undefined ? story_content : story;
    if (finalStory  !== undefined) updates.story       = finalStory;

    // 更新 projects 表
    if (Object.keys(updates).length > 0) {
      const { error: projErr } = await supabaseAdmin
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (projErr) return NextResponse.json({ success: false, error: projErr.message }, { status: 500 });
    }

    // 更新 stories 表（如果传了 story_content 或 story）
    const finalStory = story_content !== undefined ? story_content : story;
    if (finalStory !== undefined) {
      // 先查是否已有 story 记录
      const { data: existingStory } = await supabaseAdmin
        .from('stories')
        .select('id')
        .eq('project_id', id)
        .maybeSingle();

      if (existingStory) {
        // 已有记录，更新
        await supabaseAdmin.from('stories').update({ content: finalStory }).eq('id', existingStory.id);
      } else {
        // 新建 story 记录
        const { data: newStory } = await supabaseAdmin.from('stories').insert({
          project_id: id,
          content: finalStory,
          title: title ?? '未命名故事',
        }).select('id').single();
      }
    }

    // 更新 hero_designs 表（upsert，兼容 hero_design 或 hero_designs）
    if (hero_designs !== undefined || hero_design !== undefined) {
      const hdRaw = hero_designs ?? hero_design;
      const hd = typeof hdRaw === 'string' ? JSON.parse(hdRaw) : hdRaw;
      
      // 先查是否已有记录
      const { data: existingHero } = await supabaseAdmin
        .from('hero_designs')
        .select('id')
        .eq('project_id', id)
        .maybeSingle();

      if (existingHero) {
        // 已有记录，更新
        const { error: heroErr } = await supabaseAdmin
          .from('hero_designs')
          .update(hd)
          .eq('id', existingHero.id);
        if (heroErr) console.error('⚠️ hero_design 更新失败:', heroErr);
      } else {
        // 新建记录
        const { error: heroErr } = await supabaseAdmin
          .from('hero_designs')
          .insert({ project_id: id, ...hd });
        if (heroErr) console.error('⚠️ hero_design 创建失败:', heroErr);
      }
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
          ...(finalStory !== undefined && { story_content: finalStory }),
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
