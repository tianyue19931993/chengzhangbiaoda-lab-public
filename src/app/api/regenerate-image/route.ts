import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateImage } from '@/lib/doubao-api';
import { downloadImageToBuffer } from '@/lib/storage-helper';

/**
 * POST /api/regenerate-image
 * 用新 Prompt 重新生成单张分镜图
 * Body: { projectId, orderIndex, prompt }
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, orderIndex, prompt } = await request.json();
    if (!projectId) return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });
    if (orderIndex === undefined || orderIndex === null) return NextResponse.json({ success: false, error: '缺少 orderIndex' }, { status: 400 });
    if (!prompt) return NextResponse.json({ success: false, error: '缺少 prompt' }, { status: 400 });

    console.log(`🔄 重新生成分镜 ${Number(orderIndex) + 1} | project=${projectId}`);

    // 查现有图片记录
    const { data: existing, error: findErr } = await supabaseAdmin
      .from('images')
      .select('*')
      .eq('project_id', projectId)
      .eq('order_index', orderIndex)
      .single();

    if (findErr || !existing) {
      return NextResponse.json({ success: false, error: '未找到对应的图片记录' }, { status: 404 });
    }

    if ((existing.regeneration_count || 0) >= 1) {
      return NextResponse.json({ success: false, error: '该图片已达到最大重生次数（1次）' }, { status: 403 });
    }

    // 调用豆包生图 API
    const imageUrl = await generateImage(prompt);
    console.log(`✅ 分镜 ${Number(orderIndex) + 1} 生图成功`);

    // 下载并上传到 Supabase Storage
    const { buffer, contentType } = await downloadImageToBuffer(imageUrl);
    const fileName = `${projectId}/image_${Number(orderIndex) + 1}_regen_${Date.now()}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from('generated-images')
      .upload(fileName, buffer, { contentType: contentType || 'image/png', upsert: true });

    if (upErr) throw upErr;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    // 更新数据库记录
    const { error: updateErr } = await supabaseAdmin
      .from('images')
      .update({
        url:                 publicUrl,
        prompt:              prompt,
        regeneration_count:  (existing.regeneration_count || 0) + 1,
      })
      .eq('id', existing.id);

    if (updateErr) throw updateErr;

    console.log(`✅ 分镜 ${Number(orderIndex) + 1} 重生完成`);

    // 检查是否所有 9 张图都生成完了，若是则更新项目状态
    const { count } = await supabaseAdmin
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .not('url', 'is', null);

    if (count === 9) {
      await supabaseAdmin
        .from('projects')
        .update({ status: 'images_generated' })
        .eq('id', projectId);
    }

    return NextResponse.json({ success: true, data: { url: publicUrl, orderIndex } });
  } catch (err: any) {
    console.error('❌ 单图重生失败:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
