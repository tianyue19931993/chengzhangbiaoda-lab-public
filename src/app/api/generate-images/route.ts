import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateImagesWithJimeng } from '@/lib/playwright/jimeng-automation';

export async function POST(request: NextRequest) {
  try {
    console.log('🎨 开始生成九宫格图片...');
    
    const body = await request.json();
    const { projectId, prompts, style = 'pixar' } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: '未提供项目 ID' },
        { status: 400 }
      );
    }
    
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json(
        { success: false, error: '未提供提示词' },
        { status: 400 }
      );
    }
    
    console.log(`📺 项目 ID: ${projectId}`);
    console.log(`🎨 提示词数量: ${prompts.length}`);
    console.log(`🎨 风格: ${style}`);
    
    // 更新项目状态
    console.log('📝 更新项目状态: generating_images');
    const { error: statusError } = await supabaseAdmin
      .from('projects')
      .update({ status: 'generating_images' })
      .eq('id', projectId);
    
    if (statusError) {
      console.error('❌ 更新状态失败:', statusError);
      return NextResponse.json(
        { success: false, error: `更新状态失败: ${statusError.message}` },
        { status: 500 }
      );
    }
    
    // 调用即梦生成图片
    console.log('🤖 调用即梦 AI 生成图片...');
    const result = await generateImagesWithJimeng(prompts, style);
    
    if (!result.success) {
      console.error('❌ 即梦生成图片失败:', result.error);
      
      // 更新项目状态为失败
      await supabaseAdmin
        .from('projects')
        .update({ status: 'failed' })
        .eq('id', projectId);
      
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    console.log(`✅ 图片生成成功: ${result.imageUrls.length} 张`);
    
    // 保存图片记录到数据库
    console.log('💾 保存图片记录到数据库...');
    const imageRecords = result.imageUrls.map((url, index) => ({
      project_id: projectId,
      url: url,
      prompt: prompts[index] || '',
      order_index: index,
      regeneration_count: 0,
    }));
    
    const { data: images, error: imagesError } = await supabaseAdmin
      .from('images')
      .insert(imageRecords)
      .select();
    
    if (imagesError) {
      console.error('❌ 保存图片记录失败:', imagesError);
      return NextResponse.json(
        { success: false, error: `保存图片记录失败: ${imagesError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`✅ ${images.length} 张图片记录已保存`);
    
    // 更新项目状态
    console.log('📝 更新项目状态: images_generated');
    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({ status: 'images_generated' })
      .eq('id', projectId);
    
    if (updateError) {
      console.warn('⚠️ 更新项目状态失败:', updateError);
    }
    
    console.log('✅ 九宫格生成流程完成');
    
    return NextResponse.json({
      success: true,
      data: {
        projectId,
        images: images.map(img => ({
          id: img.id,
          url: img.url,
          prompt: img.prompt,
          orderIndex: img.order_index,
        })),
      },
    });
  } catch (error: any) {
    console.error('❌ 生成图片过程出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
