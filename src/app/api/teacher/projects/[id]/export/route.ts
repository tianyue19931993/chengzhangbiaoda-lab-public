import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/teacher/projects/[id]/export
 * 
 * 策略：先生成签名上传 URL，让前端直接上传到 Supabase Storage，
 * 然后再调用此接口记录数据库。
 * 
 * 如果文件较小（<4MB），也可以直接上传。
 */

// POST - 处理小文件直接上传 + 数据库更新
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file     = formData.get('file') as File | null;
    const format   = (formData.get('format') as string) || 'storyboard';
    const teacherId = (formData.get('teacherId') as string) || 'system';
    // 支持直接传入已上传的 fileUrl（客户端直传场景）
    const existingFileUrl = (formData.get('fileUrl') as string) || '';

    if (!file && !existingFileUrl) {
      return NextResponse.json({ success: false, error: '请选择要上传的文件' }, { status: 400 });
    }

    const bucketMap: Record<string, string> = {
      storyboard: 'generated-images',
      video: 'videos',
    };
    const bucket = bucketMap[format];
    if (!bucket) {
      return NextResponse.json({ success: false, error: '无效的格式' }, { status: 400 });
    }

    let fileUrl = existingFileUrl;

    // 如果有文件且没有现成的 URL，直接上传（小文件）
    if (file && !fileUrl) {
      const ext = file.name.split('.').pop() ?? (format === 'video' ? 'mp4' : 'png');
      const fileName = format + '/' + id + '-' + Date.now() + '.' + ext;

      const fileBuffer = await file.arrayBuffer();

      const { error: storageErr } = await supabaseAdmin.storage
        .from(bucket)
        .upload(fileName, fileBuffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true,
        });

      if (storageErr) {
        return NextResponse.json({ success: false, error: '文件上传失败：' + storageErr.message }, { status: 500 });
      }

      const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
      fileUrl = urlData.publicUrl;
    }

    if (!fileUrl) {
      return NextResponse.json({ success: false, error: '无法获取文件URL' }, { status: 500 });
    }

    // 更新项目字段
    const updateField = format === 'storyboard' ? 'storyboard_image_url' : 'video_url';
    const { error: updateErr } = await supabaseAdmin
      .from('projects')
      .update({ [updateField]: fileUrl })
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ success: false, error: '更新项目失败：' + updateErr.message }, { status: 500 });
    }

    // 记录日志
    try {
      await supabaseAdmin.from('export_logs').insert({
        project_id: id,
        teacher_id: teacherId,
        format,
        file_url: fileUrl,
      });
    } catch (_) {}

    return NextResponse.json({ success: true, data: { fileUrl, format } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? '服务器错误' }, { status: 500 });
  }
}

// GET - 获取签名上传 URL（用于大文件客户端直传）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'storyboard';
    const fileName = searchParams.get('fileName') || 'upload';
    const contentType = searchParams.get('contentType') || 'application/octet-stream';

    const bucketMap: Record<string, string> = {
      storyboard: 'generated-images',
      video: 'videos',
    };
    const bucket = bucketMap[format];
    if (!bucket) {
      return NextResponse.json({ success: false, error: '无效的格式' }, { status: 400 });
    }

    const ext = fileName.split('.').pop() ?? (format === 'video' ? 'mp4' : 'png');
    const path = format + '/' + id + '-' + Date.now() + '.' + ext;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json({
      success: true,
      data: {
        signedUrl: data.signedUrl,
        token: data.token,
        path,
        publicUrl: urlData.publicUrl,
        bucket,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? '服务器错误' }, { status: 500 });
  }
}
