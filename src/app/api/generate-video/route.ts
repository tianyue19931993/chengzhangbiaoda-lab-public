import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateVideoWithJimeng } from '@/lib/playwright/jimeng-automation';
import { videoPoller } from '@/lib/playwright/video-poller';

export async function POST(request: NextRequest) {
  try {
    console.log('🎬 开始生成视频...');
    
    const body = await request.json();
    const { projectId, imageUrls, prompt, style = 'pixar' } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: '未提供项目 ID' },
        { status: 400 }
      );
    }
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: '未提供图片 URL' },
        { status: 400 }
      );
    }
    
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: '未提供视频提示词' },
        { status: 400 }
      );
    }
    
    console.log(`📺 项目 ID: ${projectId}`);
    console.log(`🎨 图片数量: ${imageUrls.length}`);
    console.log(`🎨 风格: ${style}`);
    
    // 检查项目是否存在
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }
    
    // 检查视频生成次数
    const { count: videoCount, error: countError } = await supabaseAdmin
      .from('videos')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);
    
    if (countError) {
      console.error('❌ 查询视频次数失败:', countError);
    }
    
    const currentCount = videoCount || 0;
    console.log(`📊 当前视频生成次数: ${currentCount}`);
    
    // 第一次免费，后续收费
    if (currentCount > 0) {
      console.log('💰 需要付费生成');
      // TODO: 实现支付逻辑
      return NextResponse.json(
        { 
          success: false, 
          error: '需要付费',
          data: {
            price: 9.9,
            count: currentCount,
          }
        },
        { status: 402 }
      );
    }
    
    // 更新项目状态
    console.log('📝 更新项目状态: generating_video');
    const { error: statusError } = await supabaseAdmin
      .from('projects')
      .update({ status: 'generating_video' })
      .eq('id', projectId);
    
    if (statusError) {
      console.error('❌ 更新状态失败:', statusError);
      return NextResponse.json(
        { success: false, error: `更新状态失败: ${statusError.message}` },
        { status: 500 }
      );
    }
    
    // 创建视频记录
    console.log('📝 创建视频记录...');
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .insert({
        project_id: projectId,
        prompt: prompt,
        generation_count: currentCount + 1,
        status: 'pending',
      })
      .select()
      .single();
    
    if (videoError) {
      console.error('❌ 创建视频记录失败:', videoError);
      return NextResponse.json(
        { success: false, error: `创建视频记录失败: ${videoError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`✅ 视频记录已创建: ${video.id}`);
    
    // 调用即梦生成视频（异步）
    console.log('🤖 调用即梦 AI 生成视频...');
    
    // 注意：即梦视频生成是异步的，这里先返回，然后通过轮询获取结果
    generateVideoWithJimeng(imageUrls, prompt, style)
      .then(async (result) => {
        if (result.success && result.videoUrl) {
          console.log(`✅ 视频生成成功: ${result.videoUrl}`);
          
          // 更新视频记录
          await supabaseAdmin
            .from('videos')
            .update({
              url: result.videoUrl,
              status: 'completed',
            })
            .eq('id', video.id);
          
          // 更新项目状态
          await supabaseAdmin
            .from('projects')
            .update({ status: 'completed' })
            .eq('id', projectId);
          
          console.log('✅ 视频生成流程完成');
        } else {
          console.error('❌ 视频生成失败:', result.error);
          
          // 更新视频记录
          await supabaseAdmin
            .from('videos')
            .update({
              status: 'failed',
              error_message: result.error,
            })
            .eq('id', video.id);
          
          // 更新项目状态
          await supabaseAdmin
            .from('projects')
            .update({ status: 'failed' })
            .eq('id', projectId);
        }
      })
      .catch(async (error) => {
        console.error('❌ 视频生成过程出错:', error);
        
        // 更新视频记录
        await supabaseAdmin
          .from('videos')
          .update({
            status: 'failed',
            error_message: error.message,
          })
          .eq('id', video.id);
        
        // 更新项目状态
        await supabaseAdmin
          .from('projects')
          .update({ status: 'failed' })
          .eq('id', projectId);
      });
    
    // 立即返回，不等待视频生成完成
    console.log('✅ 视频生成任务已启动（异步）');
    
    return NextResponse.json({
      success: true,
      data: {
        projectId,
        videoId: video.id,
        status: 'pending',
        message: '视频生成中，请稍后查看',
      },
    });
  } catch (error: any) {
    console.error('❌ 生成视频过程出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
