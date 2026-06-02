import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { understandImage, generateStory } from '@/lib/doubao-api';
import {
  STORYBOARD_STRUCTURE,
  buildStoryboardImagePrompt,
  DEFAULT_HERO_DESIGN,
  DEFAULT_STORY,
  DEFAULT_STORY_TITLE,
  getStyleById,
} from '@/prompts';

/**
 * POST /api/generate-story
 *
 * 完整流程：
 *   1. 豆包视觉理解图片
 *   2. 豆包 LLM 生成结构化故事 + hero_design + 9 条分镜描述
 *   3. 基于 hero_design + 风格生成 9 条分镜 Prompt
 *   4. 写入 hero_designs 表 + storyboard_items 表 + 更新 projects 表
 *
 * API Key 未配置时：使用默认故事数据降级，保证流程不中断
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, imageUrl, style = 'pixar' } = await request.json();
    if (!projectId) return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });
    if (!imageUrl)  return NextResponse.json({ success: false, error: '缺少 imageUrl' },  { status: 400 });

    console.log(`🚀 generate-story | project=${projectId} style=${style}`);

    // ── 状态更新为 drafting ─────────────────────────────
    await supabaseAdmin.from('projects').update({ status: 'drafting' }).eq('id', projectId);

    const hasKey = !!process.env.DOUBAO_API_KEY;
    let heroDesign: typeof DEFAULT_HERO_DESIGN = DEFAULT_HERO_DESIGN;
    let title = DEFAULT_STORY_TITLE;
    let storyText = DEFAULT_STORY;
    const storyboardItems = STORYBOARD_STRUCTURE.map((s) => ({
      sortOrder:  s.sortOrder,
      title:      s.title,
      description: s.description,
    }));

    // ── AI 生成（API Key 可用时） ────────────────────────
    if (hasKey) {
      console.log('🟢 使用豆包 API');

      const imageUnderstanding = await understandImage(imageUrl);
      console.log('🔍 视觉理解:', imageUnderstanding.slice(0, 80));

      const storyObj = await generateStory(imageUnderstanding, style);

      const hd = storyObj.hero_design ?? {};
      heroDesign = {
        name:    hd.name    ?? DEFAULT_HERO_DESIGN.name,
        species: hd.species ?? DEFAULT_HERO_DESIGN.species,
        // LLM 返回 fur_color / clothes，需要映射到 color / costume
        color:   (hd as any).fur_color ?? (hd as any).color ?? DEFAULT_HERO_DESIGN.color,
        costume: (hd as any).clothes ?? (hd as any).costume ?? DEFAULT_HERO_DESIGN.costume,
        prop:    (hd as any).item ?? (hd as any).prop ?? DEFAULT_HERO_DESIGN.prop,
      };
      title = storyObj.title ?? DEFAULT_STORY_TITLE;
      storyText = Object.entries({
        1: '原本生活', 2: '问题出现', 3: '接受任务',
        4: '遇到困难', 5: '获得帮助', 6: '开始成长',
        7: '真相浮现', 8: '最终挑战', 9: '英雄归来',
      })
        .map(([k, phase]) => {
          const scene = storyObj.storyboard?.find((s: any) => String(s.scene) === k || String(s.sortOrder) === k);
          return scene ? `[${phase}] ${scene.description}` : '';
        })
        .filter(Boolean)
        .join('\n\n');

      // 如果 LLM 返回了完整 storyboard 用它覆盖默认值
      if (storyObj.storyboard && storyObj.storyboard.length >= 9) {
        for (let i = 0; i < 9; i++) {
          const s = storyObj.storyboard[i] as any;
          storyboardItems[i] = {
            sortOrder: (i + 1) as 1|2|3|4|5|6|7|8|9,
            title:     s.title     ?? STORYBOARD_STRUCTURE[i]!.title,
            description: s.description ?? STORYBOARD_STRUCTURE[i]!.description,
          };
        }
      }
    } else {
      console.log('🟡 DOUBAO_API_KEY 未配置，使用硬编码默认值（不依赖数据库）');
      // ⚠️ 关键：直接使用硬编码默认值，不从数据库读取
      // 这样即使数据库中还没有 is_default=true 的记录，也能正常写入
      heroDesign = { ...DEFAULT_HERO_DESIGN };
      title = DEFAULT_STORY_TITLE;
      storyText = DEFAULT_STORY;
    }

    // ── 构建 9 条分镜 Prompt ──────────────────────────────
    const prompts = storyboardItems.map((item) =>
      buildStoryboardImagePrompt(item.title, item.description, heroDesign, style)
    );

    // ── 写入数据库 ───────────────────────────────────────

    // 1) hero_designs 表
    const { error: heroErr } = await supabaseAdmin.from('hero_designs').upsert(
      { project_id: projectId, ...heroDesign },
      { onConflict: 'project_id' }
    );
    if (heroErr) console.error('⚠️ hero_designs 写入失败:', heroErr);

    // 2) storyboard_items 表（先删后插，保证 9 条）
    await supabaseAdmin.from('storyboard_items').delete().eq('project_id', projectId);
    const { error: sbErr } = await supabaseAdmin.from('storyboard_items').insert(
      storyboardItems.map((item, i) => ({
        project_id:  projectId,
        sort_order:  item.sortOrder,
        title:       item.title,
        description: item.description,
        prompt:      prompts[i],
        status:      'pending',
      }))
    );
    if (sbErr) console.error('⚠️ storyboard_items 写入失败:', sbErr);

    // 3) stories 表（写入故事正文）
    const { data: storyRow } = await supabaseAdmin.from('stories').insert({
      project_id: projectId,
      title:     title,
      content:   storyText,
    }).select('id').single();

    // 4) 更新 projects 表（story_id 关联）
    const { error: projErr } = await supabaseAdmin.from('projects').update({
      title:     title,
      story_id:  storyRow?.id ?? null,
      status:    'story_done',
    }).eq('id', projectId);
    if (projErr) console.error('⚠️ projects 更新失败:', projErr);

    console.log(`✅ generate-story 完成 | usedFallback=${!hasKey}`);
    return NextResponse.json({
      success:     true,
      data:        { projectId, title, prompts, story: { title, heroDesign, storyboard: storyboardItems } },
      usedFallback: !hasKey,
    });
  } catch (err: any) {
    console.error('❌ generate-story 失败:', err);
    try {
      const body = await request.json().catch(() => ({}));
      if (body.projectId) {
        await supabaseAdmin.from('projects').update({ status: 'failed' }).eq('id', body.projectId);
      }
    } catch {}
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
