import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateStoryWithDoubao } from '@/lib/playwright/doubao-automation';

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 开始生成故事...');
    
    const body = await request.json();
    const { projectId, imageUrl, style = 'pixar' } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: '未提供项目 ID' },
        { status: 400 }
      );
    }
    
    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: '未提供图片 URL' },
        { status: 400 }
      );
    }
    
    console.log(`📺 项目 ID: ${projectId}`);
    console.log(`🎨 风格: ${style}`);
    
    // 更新项目状态
    console.log('📝 更新项目状态: understanding');
    await supabaseAdmin
      .from('projects')
      .update({ status: 'understanding' })
      .eq('id', projectId);
    
    // 下载图片到本地（Playwright 需要本地文件路径）
    console.log('📥 下载图片到本地...');
    const imagePath = await downloadImage(imageUrl, projectId);
    
    // 调用豆包生成故事
    console.log('🤖 调用豆包 AI...');
    const result = await generateStoryWithDoubao(imagePath, style);
    
    if (!result.success) {
      console.error('❌ 豆包生成失败:', result.error);
      
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
    
    console.log('✅ 故事生成成功');
    console.log(`📖 故事长度: ${result.story.length} 字符`);
    console.log(`🎨 生成 ${result.prompts.length} 个提示词`);
    
    // 更新项目记录
    console.log('💾 保存故事到数据库...');
    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        story: result.story,
        style: style,
        status: 'story_generated',
      })
      .eq('id', projectId);
    
    if (updateError) {
      console.error('❌ 更新项目失败:', updateError);
      return NextResponse.json(
        { success: false, error: `保存故事失败: ${updateError.message}` },
        { status: 500 }
      );
    }
    
    // 保存 prompts 到项目（可以存在 story 字段的 JSON 中，或创建新表）
    // 这里简单存在项目记录中
    console.log('💾 保存提示词到数据库...');
    const { error: promptError } = await supabaseAdmin
      .from('projects')
      .update({
        story: JSON.stringify({
          story: result.story,
          prompts: result.prompts,
        }),
      })
      .eq('id', projectId);
    
    if (promptError) {
      console.warn('⚠️ 保存提示词失败:', promptError);
    }
    
    console.log('✅ 故事生成流程完成');
    
    return NextResponse.json({
      success: true,
      data: {
        projectId,
        story: result.story,
        prompts: result.prompts,
      },
    });
  } catch (error: any) {
    console.error('❌ 生成故事过程出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 下载图片到本地
async function downloadImage(url: string, projectId: string): Promise<string> {
  const fs = require('fs');
  const path = require('path');
  
  // 创建临时目录
  const tempDir = path.join('/tmp', 'mr-animation-images');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const fileName = `${projectId}-original.jpg`;
  const filePath = path.join(tempDir, fileName);
  
  // 下载图片
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  
  fs.writeFileSync(filePath, Buffer.from(buffer));
  
  console.log(`✅ 图片已保存到: ${filePath}`);
  
  return filePath;
}
