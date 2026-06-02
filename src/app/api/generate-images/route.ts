import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateImage } from '@/lib/doubao-api';
import { downloadImageToBuffer } from '@/lib/storage-helper';

/**
 * POST /api/generate-images
 * 从 images 表读取已保存的 prompts，逐张生成 9 张分镜图
 * 请求体: { projectId, style? }
 * 不需要传 prompts，prompts 已在 generate-story 阶段写入 images 表
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, style = 'pixar' } = await request.json();
    if (!projectId)
      return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });

    console.log(`🎨 generate-images 开始 | project=${projectId}`);

    // 更新状态
    await supabaseAdmin.from('projects').update({ status: 'generating_images' }).eq('id', projectId);

    // 从 images 表读取 prompts（generate-story 阶段已写入）
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

    // 逐张生成（豆包生图 API 同步，逐张避免并发超限）
    for (let i = 0; i < imageRows.length; i++) {
      const row = imageRows[i];
      try {
        console.log(`🎨 生成第 ${i + 1}/${imageRows.length} 张...`);
        const imageUrl = await generateImage(row.prompt);

        // 下载图片并上传到 Supabase Storage
        const { buffer, contentType } = await downloadImageToBuffer(imageUrl);
        const fileName = `${projectId}/image_${i + 1}_${Date.now()}.png`;
        const { error: upErr } = await supabaseAdmin.storage
          .from('generated-images')
          .upload(fileName, buffer, { contentType: contentType || 'image/png', upsert: true });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('generated-images')
          .getPublicUrl(fileName);

        // 更新 images 表记录
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

    // 更新项目状态
    await supabaseAdmin.from('projects').update({ status: 'images_generated' }).eq('id', projectId);

    console.log(`✅ generate-images 完成`);
    return NextResponse.json({ success: true, data: { projectId } });
  } catch (err: any) {
    console.error('❌ generate-images 异常:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
