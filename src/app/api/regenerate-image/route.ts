import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateImage } from '@/lib/doubao-api';
import { downloadImageToBuffer } from '@/lib/storage-helper';

/**
 * POST /api/regenerate-image
 *
 * 用用户自定义 Prompt 重新生成单张分镜图
 * Body: { projectId, sortOrder, prompt }
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, sortOrder, prompt } = await request.json();

    if (!projectId)
      return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });
    if (sortOrder === undefined || sortOrder === null)
      return NextResponse.json({ success: false, error: '缺少 sortOrder' }, { status: 400 });
    if (!prompt?.trim())
      return NextResponse.json({ success: false, error: '缺少 prompt' }, { status: 400 });

    console.log(`🔄 重新生成分镜 ${sortOrder} | project=${projectId}`);

    // ── 查找分镜记录 ─────────────────────────────────────
    const { data: item, error: findErr } = await supabaseAdmin
      .from('storyboard_items')
      .select('*')
      .eq('project_id', projectId)
      .eq('sort_order', Number(sortOrder))
      .single();

    if (findErr || !item) {
      return NextResponse.json({ success: false, error: '未找到对应的分镜记录' }, { status: 404 });
    }

    // ── 调用豆包生图 API ─────────────────────────────────
    if (!process.env.DOUBAO_API_KEY) {
      return NextResponse.json({ success: false, error: 'DOUBAO_API_KEY 未配置，无法生成图片' }, { status: 503 });
    }

    const imageUrl = await generateImage(prompt);
    console.log('✅ 分镜生图成功');

    // ── 下载并上传到 Supabase Storage ─────────────────────
    const { buffer, contentType } = await downloadImageToBuffer(imageUrl);
    const fileName = `storyboards/${projectId}/scene_${sortOrder}_regen_${Date.now()}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from('generated-images')
      .upload(fileName, buffer, { contentType: contentType ?? 'image/png', upsert: true });

    if (upErr) throw upErr;

    const { data: urlData } = supabaseAdmin.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    // ── 更新数据库 ───────────────────────────────────────
    const { error: updateErr } = await supabaseAdmin
      .from('storyboard_items')
      .update({ prompt: prompt.trim(), image_url: urlData.publicUrl, status: 'success' })
      .eq('id', item.id);

    if (updateErr) throw updateErr;

    console.log(`✅ 分镜 ${sortOrder} 重新生成完成`);

    return NextResponse.json({ success: true, data: { url: urlData.publicUrl, sortOrder } });
  } catch (err: any) {
    console.error('❌ regenerate-image 失败:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
