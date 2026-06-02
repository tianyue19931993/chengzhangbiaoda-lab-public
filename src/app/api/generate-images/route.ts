import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateImage } from '@/lib/doubao-api';
import { downloadImageToBuffer } from '@/lib/storage-helper';

/**
 * POST /api/generate-images
 * 用豆包 API 独立生成 9 张分镜图
 * 每张图单独调用，确保可单独重生
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, prompts, style = 'pixar' } = await request.json();
    if (!projectId) return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ success: false, error: '缺少 prompts' }, { status: 400 });
    }

    console.log(`🎨 generate-images 开始 | project=${projectId} count=${prompts.length}`);

    // 更新状态
    await supabaseAdmin.from('projects').update({ status: 'generating_images' }).eq('id', projectId);

    const imageRecords: any[] = [];
    const storyboardTitles = await getStoryboardTitles(projectId);

    // 逐张生成（豆包生图 API 是同步的，逐张调避免并发超限）
    for (let i = 0; i < prompts.length; i++) {
      try {
        console.log(`🎨 生成第 ${i + 1}/9 张...`);
        const imageUrl = await generateImage(prompts[i]);

        // 下载图片并上传到 Supabase Storage
        const { buffer, contentType } = await downloadImageToBuffer(imageUrl);
        const fileName = `${projectId}/image_${i + 1}_${Date.now()}.png`;
        const { data: upData, error: upErr } = await supabaseAdmin.storage
          .from('generated-images')
          .upload(fileName, buffer, { contentType: contentType || 'image/png', upsert: true });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('generated-images')
          .getPublicUrl(fileName);

        imageRecords.push({
          project_id:   projectId,
          url:          publicUrl,
          prompt:       prompts[i],
          order_index:  i,
          scene_title:  storyboardTitles[i] || `分镜 ${i + 1}`,
          regeneration_count: 0,
        });

        console.log(`✅ 第 ${i + 1} 张完成`);
      } catch (err: any) {
        console.error(`❌ 第 ${i + 1} 张生成失败:`, err.message);
        // 继续生成其他图，不中断
      }
    }

    if (imageRecords.length === 0) {
      await supabaseAdmin.from('projects').update({ status: 'failed' }).eq('id', projectId);
      return NextResponse.json({ success: false, error: '所有图片生成均失败' }, { status: 500 });
    }

    // 批量写入数据库
    const { data: images, error: dbErr } = await supabaseAdmin
      .from('images')
      .insert(imageRecords)
      .select();

    if (dbErr) {
      console.error('❌ 保存图片记录失败:', dbErr);
      return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 });
    }

    // 更新项目状态
    await supabaseAdmin.from('projects').update({ status: 'images_generated' }).eq('id', projectId);

    console.log(`✅ generate-images 完成，共 ${images.length} 张`);
    return NextResponse.json({ success: true, data: { projectId, images } });
  } catch (err: any) {
    console.error('❌ generate-images 异常:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/** 获取项目的 storyboard titles，用于填充 scene_title */
async function getStoryboardTitles(projectId: string): Promise<string[]> {
  try {
    const { data } = await supabaseAdmin
      .from('projects')
      .select('storyboard')
      .eq('id', projectId)
      .single();
    if (data?.storyboard) {
      const sb = typeof data.storyboard === 'string' ? JSON.parse(data.storyboard) : data.storyboard;
      return (sb || []).map((s: any) => s.title || '');
    }
  } catch {}
  return [];
}
