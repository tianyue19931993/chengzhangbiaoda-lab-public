import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 开始处理文件上传...');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '未找到上传文件' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未提供用户 ID' },
        { status: 400 }
      );
    }
    
    console.log(`📄 文件名: ${file.name}`);
    console.log(`📏 文件大小: ${(file.size / 1024).toFixed(2)} KB`);
    console.log(`📂 文件类型: ${file.type}`);
    
    // 确保用户存在（自动创建）
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (!existingUser) {
      await supabaseAdmin.from('users').insert({ id: userId, name: '小朋友' });
      console.log(`👤 自动创建用户: ${userId}`);
    }
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '只支持 JPG、JPEG、PNG 格式' },
        { status: 400 }
      );
    }
    
    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '文件大小不能超过 10MB' },
        { status: 400 }
      );
    }
    
    // 生成唯一文件名
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    console.log(`💾 开始上传到 Supabase Storage: ${fileName}`);
    
    // 上传到 Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('original-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) {
      console.error('❌ Supabase 上传失败:', error);
      return NextResponse.json(
        { success: false, error: `上传失败: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('✅ 文件上传成功:', data.path);
    
    // 获取公开 URL
    const { data: urlData } = supabaseAdmin.storage
      .from('original-images')
      .getPublicUrl(fileName);
    
    console.log('🔗 文件 URL:', urlData.publicUrl);
    
    // 创建项目记录
    console.log('📝 创建项目记录...');
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        user_id: userId,
        original_image_url: urlData.publicUrl,
        status: 'uploading',
      })
      .select()
      .single();
    
    if (projectError) {
      console.error('❌ 创建项目失败:', projectError);
      return NextResponse.json(
        { success: false, error: `创建项目失败: ${projectError.message}` },
        { status: 500 }
      );
    }
    
    console.log('✅ 项目创建成功:', project.id);
    
    return NextResponse.json({
      success: true,
      data: {
        projectId: project.id,
        imageUrl: urlData.publicUrl,
        fileName: fileName,
      },
    });
  } catch (error: any) {
    console.error('❌ 上传过程出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 配置 Next.js 不解析 FormData
export const config = {
  api: {
    bodyParser: false,
  },
};
