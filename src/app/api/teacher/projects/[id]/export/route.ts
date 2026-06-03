import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 视频文件可能较大，增加到 60 秒

// POST /api/teacher/projects/[id]/export - 上传文件（分镜图或视频）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file     = formData.get('file') as File | null;
    const format   = (formData.get('format') as string) || 'storyboard'; // 'storyboard' | 'video'
    const teacherId = (formData.get('teacherId') as string) || 'system';

    if (!file) {
      return NextResponse.json({ success: false, error: '请选择要上传的文件' }, { status: 400 });
    }

    console.log(`[export] 开始上传: format=${format}, fileSize=${(file.size / 1024 / 1024).toFixed(2)}MB, fileType=${file.type}`);

    // 根据格式确定存储桶
    const bucketMap: Record<string, string> = {
      storyboard: 'generated-images',
      video: 'videos',
    };
    const bucket = bucketMap[format];
    if (!bucket) {
      return NextResponse.json({ success: false, error: '无效的格式，请使用 storyboard 或 video' }, { status: 400 });
    }

    // 文件大小限制
    const maxSize = format === 'video' ? 200 * 1024 * 1024 : 20 * 1024 * 1024; // 视频 200MB, 图片 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: `文件过大：${format === 'video' ? '视频最大 200MB' : '图片最大 20MB'}` 
      }, { status: 400 });
    }

    // 上传到 Storage
    const ext = file.name.split('.').pop() ?? (format === 'video' ? 'mp4' : 'png');
    const fileName = format + '/' + id + '-' + Date.now() + '.' + ext;

    const uploadStart = Date.now();
    
    // 转为 ArrayBuffer 提高传输效率
    const fileBuffer = await file.arrayBuffer();
    
    const { error: storageErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    console.log(`[export] Storage 上传耗时: ${Date.now() - uploadStart}ms`);

    if (storageErr) {
      console.error('[export] Storage 错误:', storageErr);
      return NextResponse.json({ success: false, error: '文件上传失败：' + storageErr.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
    const fileUrl = urlData.publicUrl;

    // 更新项目字段
    const updateField = format === 'storyboard' ? 'storyboard_image_url' : 'video_url';
    const { error: updateErr } = await supabaseAdmin
      .from('projects')
      .update({ [updateField]: fileUrl })
      .eq('id', id);

    if (updateErr) {
      console.error('[export] 更新项目失败:', updateErr);
      return NextResponse.json({ success: false, error: '更新项目失败：' + updateErr.message }, { status: 500 });
    }

    // 记录导出日志（非致命错误）
    try {
      await supabaseAdmin
        .from('export_logs')
        .insert({
          project_id: id,
          teacher_id: teacherId,
          format,
          file_url: fileUrl,
        });
    } catch (logErr: any) {
      console.error('[export] 日志记录失败（非致命）:', logErr?.message ?? logErr);
    }

    return NextResponse.json({
      success: true,
      data: { fileUrl, format },
    });
  } catch (err: any) {
    console.error('[export] 异常:', err?.message ?? err);
    // 确保始终返回合法 JSON
    return NextResponse.json({ 
      success: false, 
      error: err?.message ?? '服务器内部错误，请重试' 
    }, { status: 500 });
  }
}
