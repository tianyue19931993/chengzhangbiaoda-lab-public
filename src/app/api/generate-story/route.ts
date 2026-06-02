import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { understandImage, generateStory, buildPrompts } from '@/lib/doubao-api';

/**
 * POST /api/generate-story
 * 完整流程：视觉理解 → 生成结构化故事 → 生成 9 条分镜 Prompt
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, imageUrl, style = 'pixar' } = await request.json();
    if (!projectId) return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });
    if (!imageUrl) return NextResponse.json({ success: false, error: '缺少 imageUrl'  }, { status: 400 });

    console.log(`🚀 generate-story 开始 | project=${projectId} style=${style}`);

    // Step 1: 更新状态 → understanding
    await supabaseAdmin.from('projects').update({ status: 'understanding' }).eq('id', projectId);

    // Step 2: 豆包视觉理解
    const imageUnderstanding = await understandImage(imageUrl);
    console.log('🔍 视觉理解结果:', imageUnderstanding.slice(0, 100));

    // Step 3: 豆包 LLM 生成结构化故事
    const storyObj = await generateStory(imageUnderstanding, style);
    console.log('📖 故事生成完成:', storyObj.title);

    // Step 4: 根据故事 + hero_design 生成 9 条 Prompt
    const prompts = buildPrompts(storyObj, style);
    console.log(`🎨 生成 ${prompts.length} 条分镜 Prompt`);

    // Step 5: 存入数据库（projects 表 + images 表）
    const { error: dbError } = await supabaseAdmin
      .from('projects')
      .update({
        title:       storyObj.title,
        theme:        storyObj.theme,
        hero_design:  JSON.stringify(storyObj.hero_design),
        storyboard:   JSON.stringify(storyObj.storyboard),
        story:        JSON.stringify({ story: storyObj, prompts }),
        style,
        status:       'story_generated',
      })
      .eq('id', projectId);

    if (dbError) {
      console.error('❌ 保存故事失败:', dbError);
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    // Step 6: 往 images 表插入 9 条分镜记录（含 prompt/scene_title）
    const imageRows = prompts.map((prompt: string, i: number) => ({
      project_id:  projectId,
      order_index: i,
      prompt:      prompt,
      scene_title: storyObj.storyboard?.[i]?.title || `分镜 ${i + 1}`,
      status:      'pending',
      regeneration_count: 0,
    }));
    const { error: imgError } = await supabaseAdmin.from('images').upsert(imageRows, {
      onConflict: 'project_id,order_index',
      ignoreDuplicates: false,
    });
    if (imgError) {
      console.error('❌ 插入 images 记录失败:', imgError);
      // 不阻断主流程，只警告
    } else {
      console.log(`✅ 已插入/更新 ${imageRows.length} 条 images 记录`);
    }

    console.log('✅ generate-story 完成');
    return NextResponse.json({
      success: true,
      data: { projectId, title: storyObj.title, theme: storyObj.theme, prompts, story: storyObj },
    });
  } catch (err: any) {
    console.error('❌ generate-story 失败:', err);
    // 失败时更新状态
    try {
      const { projectId } = await request.json().catch(() => ({ projectId: null }));
      if (projectId) {
        await supabaseAdmin.from('projects').update({ status: 'failed' }).eq('id', projectId);
      }
    } catch {}
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
