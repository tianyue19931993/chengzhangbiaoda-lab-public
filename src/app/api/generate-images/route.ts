import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateImage } from '@/lib/doubao-api';
import { downloadImageToBuffer } from '@/lib/storage-helper';
import { buildStoryboardImagePrompt } from '@/prompts';

/** 生成 SVG 占位图（API Key 未配置时降级使用） */
function generatePlaceholderSVG(sceneNumber: number, sceneTitle: string, style: string): Buffer {
  const palettes: Record<string, { bg: string; fg: string; emoji: string }> = {
    pixar:     { bg: '#1a73e8', fg: '#ffffff', emoji: '⭐' },
    chinese:   { bg: '#7b1d1d', fg: '#FFD700', emoji: '🏮' },
    anime:     { bg: '#e91e8c', fg: '#ffffff', emoji: '🌸' },
    watercolor:{ bg: '#1565c0', fg: '#ffffff', emoji: '🎨' },
    cyberpunk: { bg: '#0d0d0d', fg: '#00e5ff', emoji: '🌃' },
  };
  const p = palettes[style] ?? palettes.pixar;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <rect width="1280" height="720" fill="${p.bg}"/>
  <text x="640" y="280" text-anchor="middle" font-size="160" fill="${p.fg}" font-family="Arial,sans-serif" font-weight="bold">${sceneNumber}</text>
  <text x="640" y="440" text-anchor="middle" font-size="56" fill="${p.fg}" font-family="Arial,sans-serif">${sceneTitle}</text>
  <text x="640" y="540" text-anchor="middle" font-size="32" fill="${p.fg}" font-family="Arial,sans-serif" opacity="0.6">（配置 DOUBAO_API_KEY 后生成真实图片）</text>
</svg>`;
  return Buffer.from(svg, 'utf-8');
}

/**
 * POST /api/generate-images
 *
 * 按顺序逐张生成 9 张分镜图，写入 storyboard_items 表
 * API Key 未配置时：生成 SVG 占位图
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, style = 'pixar' } = await request.json();
    if (!projectId)
      return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });

    console.log(`🎨 generate-images | project=${projectId}`);

    // ── 获取 hero_design（用于角色一致性） ────────────────
    const { data: heroRow } = await supabaseAdmin
      .from('hero_designs')
      .select('*')
      .eq('project_id', projectId)
      .single();

    const heroDesign = heroRow ?? { name: '小星星', species: '小朋友', color: '彩色', costume: '普通衣服' };

    // ── 获取分镜记录 ─────────────────────────────────────
    const { data: items, error: fetchErr } = await supabaseAdmin
      .from('storyboard_items')
      .select('id, sort_order, title, description, prompt')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    if (fetchErr || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: '未找到分镜记录，请先生成故事' }, { status: 400 });
    }

    // 优先使用数据库中的 prompt；若无则动态构建
    const finalItems = items.map((item) => ({
      ...item,
      prompt: item.prompt ?? buildStoryboardImagePrompt(item.title, item.description ?? '', heroDesign, style),
    }));

    await supabaseAdmin.from('projects').update({ status: 'storyboard_done' }).eq('id', projectId);

    const hasKey = !!process.env.DOUBAO_API_KEY;

    // ── 逐张生成 ──────────────────────────────────────────
    for (const item of finalItems) {
      try {
        // 更新状态为生成中
        await supabaseAdmin
          .from('storyboard_items')
          .update({ status: 'generating' })
          .eq('id', item.id);

        let imageUrl: string;

        if (hasKey) {
          const rawUrl = await generateImage(item.prompt ?? item.title);
          const { buffer, contentType } = await downloadImageToBuffer(rawUrl);
          const fileName = `storyboards/${projectId}/scene_${item.sort_order}_${Date.now()}.png`;
          const { error: upErr } = await supabaseAdmin.storage
            .from('generated-images')
            .upload(fileName, buffer, { contentType: contentType ?? 'image/png', upsert: true });
          if (upErr) throw upErr;
          const { data: urlData } = supabaseAdmin.storage
            .from('generated-images')
            .getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        } else {
          // 降级：SVG 占位图
          const svgBuf = generatePlaceholderSVG(item.sort_order, item.title ?? `分镜 ${item.sort_order}`, style);
          const fileName = `storyboards/${projectId}/placeholder_${item.sort_order}.svg`;
          await supabaseAdmin.storage
            .from('generated-images')
            .upload(fileName, svgBuf, { contentType: 'image/svg+xml', upsert: true });
          const { data: urlData } = supabaseAdmin.storage
            .from('generated-images')
            .getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }

        await supabaseAdmin
          .from('storyboard_items')
          .update({ image_url: imageUrl, status: 'success' })
          .eq('id', item.id);

        console.log(`✅ 分镜 ${item.sort_order}/9 完成`);
      } catch (err: any) {
        console.error(`❌ 分镜 ${item.sort_order} 失败:`, err.message);
        await supabaseAdmin
          .from('storyboard_items')
          .update({ status: 'failed' })
          .eq('id', item.id);
      }
    }

    await supabaseAdmin.from('projects').update({ status: 'storyboard_done' }).eq('id', projectId);

    return NextResponse.json({ success: true, data: { projectId }, usedFallback: !hasKey });
  } catch (err: any) {
    console.error('❌ generate-images 异常:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
