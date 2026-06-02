import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateVideo } from '@/lib/doubao-api';
import { downloadImageToBuffer, uploadToSupabaseStorage } from '@/lib/storage-helper';
import { getStyleById } from '@/prompts';

/**
 * POST /api/generate-video
 *
 * 调用豆包视频 API 生成 10 秒动画
 * 限制：每项目免费生成 1 次
 * Body: { projectId }
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();
    if (!projectId)
      return NextResponse.json({ success: false, error: '缺少 projectId' }, { status: 400 });

    console.log(`🎬 generate-video | project=${projectId}`);

    // ── 获取项目 + 分镜数据 ──────────────────────────────
    const [{ data: project }, { data: storyboard }, { data: hero }] = await Promise.all([
      supabaseAdmin.from('projects').select('*').eq('id', projectId).single(),
      supabaseAdmin.from('storyboard_items').select('image_url, title, description').eq('project_id', projectId).order('sort_order'),
      supabaseAdmin.from('hero_designs').select('*').eq('project_id', projectId).single(),
    ]);

    if (!project) return NextResponse.json({ success: false, error: '项目不存在' }, { status: 404 });

    const validImages = (storyboard ?? []).filter((s) => s.image_url);
    if (validImages.length < 9)
      return NextResponse.json({ success: false, error: '分镜图尚未全部生成，请先生成九宫格' }, { status: 400 });

    // ── 重生次数限制 ─────────────────────────────────────
    const { count } = await supabaseAdmin
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if ((count ?? 0) >= 1) {
      return NextResponse.json(
        { success: false, error: '已达免费生成上限（1次），后续需支付 ¥9.9', needPayment: true, price: 9.9 },
        { status: 402 }
      );
    }

    // ── 构建 video_prompt ────────────────────────────────
    const style = getStyleById(project.style_id ?? 'pixar');
    const heroPart = hero
      ? `主角设定：${hero.name}（${hero.species}，${hero.color}，${hero.costume}${hero.prop ? '，手持' + hero.prop : ''}）`
      : '';
    const scenePart = validImages
      .map((s, i) => `分镜${i + 1}「${s.title}」：${s.description}`)
      .join('\n');
    const videoPrompt = `故事：${project.title ?? ''}
${project.story ?? ''}
${heroPart}
分镜序列：
${scenePart}
风格：${style.name} — ${style.storyPrompt}`;

    // ── 创建视频记录 ─────────────────────────────────────
    const { data: video, error: vErr } = await supabaseAdmin
      .from('videos')
      .insert({
        project_id:       projectId,
        prompt:           videoPrompt,
        generation_count: 1,
        status:           'processing',
      })
      .select()
      .single();

    if (vErr || !video) {
      console.error('❌ 创建视频记录失败:', vErr);
      return NextResponse.json({ success: false, error: '创建视频记录失败' }, { status: 500 });
    }

    // 更新项目状态
    await supabaseAdmin.from('projects').update({ status: 'video_done' }).eq('id', projectId);
    await supabaseAdmin.from('projects').update({ video_prompt: videoPrompt }).eq('id', projectId);

    // ── 异步生成（不阻塞返回） ───────────────────────────
    generateVideoAsync(projectId, video.id, validImages.map((s) => s.image_url!), videoPrompt);

    return NextResponse.json({ success: true, data: { projectId, videoId: video.id, status: 'processing' } });
  } catch (err: any) {
    console.error('❌ generate-video 异常:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/** 异步生成视频，完成后更新数据库 */
async function generateVideoAsync(projectId: string, videoId: string, imageUrls: string[], videoPrompt: string) {
  try {
    const hasKey = !!process.env.DOUBAO_API_KEY;

    if (!hasKey) {
      console.warn('⚠️ DOUBAO_API_KEY 未设置，跳过视频生成');
      await supabaseAdmin.from('videos').update({ status: 'failed', error_message: 'API Key 未配置' }).eq('id', videoId);
      return;
    }

    const videoUrl = await generateVideo(imageUrls, videoPrompt, '');
    if (!videoUrl) throw new Error('视频生成返回为空');

    const { buffer, contentType } = await downloadImageToBuffer(videoUrl);
    const fileName = `${projectId}/video_${Date.now()}.mp4`;
    const finalUrl = await uploadToSupabaseStorage('videos', fileName, buffer, contentType ?? 'video/mp4');

    await supabaseAdmin.from('videos').update({ url: finalUrl, status: 'completed' }).eq('id', videoId);
    await supabaseAdmin.from('projects').update({ status: 'video_done' }).eq('id', projectId);
    console.log(`✅ 视频生成完成: ${finalUrl}`);
  } catch (err: any) {
    console.error('❌ 视频生成失败:', err);
    await supabaseAdmin
      .from('videos')
      .update({ status: 'failed', error_message: err.message })
      .eq('id', videoId);
    await supabaseAdmin.from('projects').update({ status: 'failed' }).eq('id', projectId);
  }
}
