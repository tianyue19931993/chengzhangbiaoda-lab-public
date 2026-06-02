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

    // 更新 projects 表的 story 字段 + stories 表（如果传了 story_content 或 story）
    const finalStoryBody = story_content !== undefined ? story_content : story;
    if (finalStoryBody !== undefined) {
      updates.story = finalStoryBody;
    }

    if (Object.keys(updates).length > 0) {
      const { error: projErr2 } = await supabaseAdmin
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (projErr2) return NextResponse.json({ success: false, error: projErr2.message }, { status: 500 });
    }

    // 更新 stories 表（如果传了故事内容）
    if (finalStoryBody !== undefined) {
      let storyId = (await supabaseAdmin.from('projects').select('story_id').eq('id', id).single())?.data?.story_id;

      if (storyId) {
        // 已有 story 记录，更新
        await supabaseAdmin.from('stories').update({ content: finalStoryBody }).eq('id', storyId);
      } else {
        // 新建 story 记录
        const { data: newStory } = await supabaseAdmin.from('stories').insert({
          project_id: id,
          content: finalStoryBody,
          title: title ?? '未命名故事',
        }).select('id').single();
        if (newStory?.id) {
          await supabaseAdmin.from('projects').update({ story_id: newStory.id }).eq('id', id);
        }
      }
    }

    // 更新 hero_designs 表（upsert，兼容 hero_design 或 hero_designs）
    if (hero_designs) {
      const hd = typeof hero_designs === 'string' ? JSON.parse(hero_designs) : hero_designs;
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
