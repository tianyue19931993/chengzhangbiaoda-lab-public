import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateUploadToken, getQiniuKey, getPublicUrl } from '@/lib/qiniu';

export const dynamic = 'force-dynamic';

/**
 * POST /api/teacher/projects/[id]/export
 * 接收前端已上传到七牛云的文件 URL，更新数据库
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const formData = await request.formData();
    const format   = (formData.get('format')   as string) || 'storyboard';
    const teacherId = (formData.get('teacherId') as string) || 'system';
    const fileUrl   = (formData.get('fileUrl')  as string) || '';

    if (!fileUrl) {
      return NextResponse.json({ success: false, error: '请提供文件URL' }, { status: 400 });
    }

    // 更新项目字段
    const updateField = format === 'storyboard' ? 'storyboard_image_url' : 'video_url';
    const { error: updateErr } = await supabaseAdmin
      .from('projects')
      .update({ [updateField]: fileUrl })
      .eq('id', numId);

    if (updateErr) {
      return NextResponse.json({ success: false, error: '更新项目失败：' + updateErr.message }, { status: 500 });
    }

    // 记录日志
    try {
      await supabaseAdmin.from('export_logs').insert({
        project_id: numId,
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

/**
 * GET /api/teacher/projects/[id]/export
 * 返回七牛云上传凭证，供前端直传
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'storyboard';
    const fileName = searchParams.get('fileName') || (format === 'video' ? 'video.mp4' : 'image.png');
    const contentType = searchParams.get('contentType') || (format === 'video' ? 'video/mp4' : 'image/png');

    const qiniuKey = getQiniuKey(format as 'video' | 'storyboard', String(numId), fileName);
    const token = generateUploadToken(qiniuKey);
    const publicUrl = getPublicUrl(qiniuKey);

    return NextResponse.json({
      success: true,
      data: {
        token,
        key: qiniuKey,
        uploadUrl: 'https://upload.qiniup.com',
        publicUrl,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? '服务器错误' }, { status: 500 });
  }
}
