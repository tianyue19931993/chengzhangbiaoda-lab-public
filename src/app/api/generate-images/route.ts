import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateImage } from '@/lib/doubao-api';
import { downloadImageToBuffer } from '@/lib/storage-helper';

/**
 * 生成默认占位 SVG 图片（纯文本 SVG，无外部依赖）
 * 返回 SVG 字符串，可直接上传到 Supabase Storage
 */
function generatePlaceholderSVG(sceneNumber: number, sceneTitle: string, style: string): string {
  const colors: Record<string, { bg: string; fg: string }> = {
    pixar:     { bg: '#1a73e8', fg: '#ffffff' },
    guofeng:   { bg: '#8B0000', fg: '#FFD700' },
    anime:     { bg: '#FF69B4', fg: '#ffffff' },
    watercolor:{ bg: '#4A90D9', fg: '#ffffff' },
    cyberpunk: { bg: '#0D0D0D', fg: '#00FFFF' },
  };
  const c = colors[style] || colors.pixar;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <rect width="1280" height="720" fill="${c.bg}"/>
    <text x="640" y="300" text-anchor="middle" font-size="120" fill="${c.fg}" font-family="Arial,sans-serif" font-weight="bold">${sceneNumber}</text>
    <text x="640" y="450" text-anchor="middle" font-size="48" fill="${c.fg}" font-family="Arial,sans-serif">${sceneTitle || '分镜 ' + sceneNumber}</text>
    <text x="640" y="550" text-anchor="middle" font-size="36" fill="${c.fg}" font-family="Arial,sans-serif" opacity="0.7">（示例图 - 请配置 DOUBAO_API_KEY 生成真实图片）</text>
  </svg>`;
}

/**
 * POST /api/generate-images
 * 从 images 表读取已保存的 prompts，逐张生成 9 张分镜图
 * 无 API Key 时降级：生成 SVG 占位图上传到 Supabase Storage，流程不中断
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, style = 'pixar' } = await request.json();
    if (!projectId)
      return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });

    console.log(`🎨 generate-images 开始 | project=${projectId}`);

    await supabaseAdmin.from('projects').update({ status: 'generating_images' }).eq('id', projectId);

    // 从 images 表读取 prompts
    const { data: imageRows, error: fetchErr } = await supabaseAdmin
      .from('images')
      .select('id,order_index,prompt,scene_title')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });

    if (fetchErr || !imageRows || imageRows.length === 0) {
      console.error('❌ 无法读取 images 表 prompt:', fetchErr);
      await supabaseAdmin.from('projects').update({ status: 'failed' }).eq('id', projectId);
      return NextResponse.json({ success: false, error: '未找到分镜 Prompt，请先生成故事' }, { status: 400 });
    }

    console.log(`🎨 共 ${imageRows.length} 条分镜记录，开始逐张生成...`);

    const hasKey = !!process.env.DOUBAO_API_KEY;

    for (let i = 0; i < imageRows.length; i++) {
      const row = imageRows[i];
      try {
        console.log(`🎨 生成第 ${i + 1}/${imageRows.length} 张...`);
        let publicUrl: string;

        if (hasKey) {
          // 正常模式：调用豆包生图 API
          const imageUrl = await generateImage(row.prompt);
          const { buffer, contentType } = await downloadImageToBuffer(imageUrl);
          const fileName = `${projectId}/image_${i + 1}_${Date.now()}.png`;
          const { error: upErr } = await supabaseAdmin.storage
            .from('generated-images')
            .upload(fileName, buffer, { contentType: contentType || 'image/png', upsert: true });
          if (upErr) throw upErr;
          const { data: { publicUrl: u } } = supabaseAdmin.storage
            .from('generated-images')
            .getPublicUrl(fileName);
          publicUrl = u;
        } else {
          // 降级模式：生成 SVG 占位图上传
          console.log(`🟡 无 API Key，使用 SVG 占位图（第 ${i + 1} 张）`);
          const svgString = generatePlaceholderSVG(i + 1, row.scene_title || `分镜 ${i + 1}`, style);
          const svgBuffer = Buffer.from(svgString, 'utf-8');
          const fileName = `${projectId}/placeholder_${i + 1}_${Date.now()}.svg`;
          const { error: upErr } = await supabaseAdmin.storage
            .from('generated-images')
            .upload(fileName, svgBuffer, { contentType: 'image/svg+xml', upsert: true });
          if (upErr) throw upErr;
          const { data: { publicUrl: u } } = supabaseAdmin.storage
            .from('generated-images')
            .getPublicUrl(fileName);
          publicUrl = u;
        }

        await supabaseAdmin
          .from('images')
          .update({ url: publicUrl, status: 'completed' })
          .eq('id', row.id);

        console.log(`✅ 第 ${i + 1} 张完成`);
      } catch (err: any) {
        console.error(`❌ 第 ${i + 1} 张生成失败:`, err.message);
        // 继续生成其他图，不中断
      }
    }

    await supabaseAdmin.from('projects').update({ status: 'images_generated' }).eq('id', projectId);

    console.log(`✅ generate-images 完成 | usedFallback: ${!hasKey}`);
    return NextResponse.json({ success: true, data: { projectId }, usedFallback: !hasKey });
  } catch (err: any) {
    console.error('❌ generate-images 异常:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
