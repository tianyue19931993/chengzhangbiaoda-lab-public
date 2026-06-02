import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateVideo } from '@/lib/doubao-api';
import { downloadImageToBuffer, uploadToSupabaseStorage } from '@/lib/storage-helper';

/**
 * POST /api/generate-video
 * 调用豆包 Seedance 2.0 生成 15 秒 16:9 动画视频
 * 无 API Key 时降级：下载示例视频上传到 Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, imageUrls, prompt, style = 'pixar' } = await request.json();
    if (!projectId) return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ success: false, error: '缺少 imageUrls' }, { status: 400 });
    }

    console.log(`🎬 generate-video 开始 | project=${projectId}`);

    // 检查是否已生成过（重生次数限制）
    const { count } = await supabaseAdmin
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if ((count || 0) >= 1) {
      return NextResponse.json(
        { success: false, error: '已生成过视频，需要付费才能重新生成', needPayment: true, price: 9.9 },
        { status: 402 }
      );
    }

    // 更新状态
    await supabaseAdmin.from('projects').update({ status: 'generating_video' }).eq('id', projectId);

    // 创建视频记录
    const { data: video, error: vErr } = await supabaseAdmin
      .from('videos')
      .insert({
        project_id:       projectId,
        prompt,
        generation_count: 1,
        status:           'processing',
        duration:         15,
        aspect_ratio:      '16:9',
      })
      .select()
      .single();

    if (vErr || !video) {
      console.error('❌ 创建视频记录失败:', vErr);
      return NextResponse.json({ success: false, error: '创建视频记录失败' }, { status: 500 });
    }

    console.log(`📺 视频记录创建: ${video.id}`);

    // 异步调用视频生成（不阻塞返回）
    generateVideoAsync(projectId, video.id, imageUrls, prompt, style);

    return NextResponse.json({
      success: true,
      data: { projectId, videoId: video.id, status: 'processing' },
    });
  } catch (err: any) {
    console.error('❌ generate-video 异常:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * 异步生成视频，完成后更新数据库
 * 无 API Key 时降级使用示例视频
 */
async function generateVideoAsync(
  projectId: string,
  videoId: string,
  imageUrls: string[],
  prompt: string,
  style: string
) {
  try {
    console.log(`🎬 开始生成视频 | hasKey=${!!process.env.DOUBAO_API_KEY}`);

    let finalUrl: string;
    const hasKey = !!process.env.DOUBAO_API_KEY;

    if (!hasKey) {
      console.warn('⚠️ DOUBAO_API_KEY 未设置，使用默认示例视频');
      // 下载示例视频并上传到 Supabase Storage
      const placeholderUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
      console.log('📥 下载示例视频...');
      const { buffer, contentType } = await downloadImageToBuffer(placeholderUrl);
      const fileName = `${projectId}/placeholder_${Date.now()}.mp4`;
      finalUrl = await uploadToSupabaseStorage('videos', fileName, buffer, contentType || 'video/mp4');
      console.log(`✅ 默认视频已上传: ${finalUrl}`);
    } else {
      console.log(`🎬 调用豆包视频生成 API...`);
      const videoUrl = await generateVideo(imageUrls, prompt, style);
      if (!videoUrl) throw new Error('视频生成返回为空');

      console.log('📥 下载视频...');
      const { buffer, contentType } = await downloadImageToBuffer(videoUrl);
      const fileName = `${projectId}/video_${Date.now()}.mp4`;
      finalUrl = await uploadToSupabaseStorage('videos', fileName, buffer, contentType || 'video/mp4');
    }

    // 更新数据库
    await supabaseAdmin
      .from('videos')
      .update({ url: finalUrl, status: 'completed' })
      .eq('id', videoId);

    await supabaseAdmin
      .from('projects')
      .update({ status: 'completed' })
      .eq('id', projectId);

    console.log(`✅ 视频生成完成: ${finalUrl}`);
  } catch (err: any) {
    console.error('❌ 视频生成失败:', err);
    await supabaseAdmin
      .from('videos')
      .update({ status: 'failed', error_message: err.message })
      .eq('id', videoId);
    await supabaseAdmin
      .from('projects')
      .update({ status: 'failed' })
      .eq('id', projectId);
  }
}
