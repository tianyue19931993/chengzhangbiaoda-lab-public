import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 增加超时时间到 30 秒

// POST /api/upload - 上传图片并创建项目
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. 解析表单数据
    const formData = await request.formData();
    const file       = formData.get('file')       as File | null;
    const childName  = (formData.get('childName') as string | null)?.trim() || '';
    const projectName = (formData.get('projectName') as string | null)?.trim() || '';
    const styleId    = (formData.get('styleId')    as string | null) || 'pixar';

    console.log(`[upload] 解析表单耗时: ${Date.now() - startTime}ms`);

    // 2. 校验参数（快速失败）
    if (!file) return NextResponse.json({ success: false, error: '请选择要上传的图片' }, { status: 400 });
    if (!childName) return NextResponse.json({ success: false, error: '请输入小朋友的名字' }, { status: 400 });
    if (!projectName) return NextResponse.json({ success: false, error: '请输入作品名称' }, { status: 400 });

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: '仅支持 JPG、PNG、WEBP 格式' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: '文件大小不能超过 10MB' }, { status: 400 });
    }

    // 3. 上传到 Supabase Storage（并行优化：先准备文件名和数组格式）
    const ext = file.name.split('.').pop() ?? 'jpg';
    const fileName = 'uploads/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
    
    const uploadStart = Date.now();
    const fileBuffer = await file.arrayBuffer(); // 转为 ArrayBuffer 提高上传速度
    
    const { error: storageErr } = await supabaseAdmin.storage
      .from('original-images')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    console.log(`[upload] Storage 上传耗时: ${Date.now() - uploadStart}ms, 文件大小: ${(file.size / 1024).toFixed(1)}KB`);

    if (storageErr) {
      console.error('[upload] Storage 错误:', storageErr);
      return NextResponse.json({ success: false, error: '图片上传失败：' + storageErr.message }, { status: 500 });
    }

    // 4. 获取公开 URL
    const { data: urlData } = supabaseAdmin.storage.from('original-images').getPublicUrl(fileName);
    const uploadedImage = urlData.publicUrl;

    // 5. 创建项目记录
    const dbStart = Date.now();
    const { data: project, error: projectErr } = await supabaseAdmin
      .from('projects')
      .insert({
        child_name: childName,
        project_name: projectName,
        style_id: styleId,
        original_image_url: uploadedImage,
        status: 'pending',
      })
      .select()
      .single();

    console.log(`[upload] 数据库写入耗时: ${Date.now() - dbStart}ms`);
    console.log(`[upload] 总耗时: ${Date.now() - startTime}ms`);

    if (projectErr || !project) {
      return NextResponse.json({ success: false, error: '创建项目失败：' + (projectErr?.message ?? '未知错误') }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { projectId: project.id, originalImageUrl: uploadedImage, fileName },
    });
  } catch (err: any) {
    console.error('[upload] 异常:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
