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

    // 查询当前项目状态，判断是否需要更新为 completed
    const { data: currentProj } = await supabaseAdmin
      .from('projects')
      .select('id, storyboard_image_url, video_url')
      .eq('id', numId)
      .single();

    // 构建更新对象：设置文件 URL + 自动判断状态
    const updateData: Record<string, any> = { [updateField]: fileUrl };
    if (currentProj) {
      const hasStoryboard = !!(format === 'storyboard' ? fileUrl : currentProj.storyboard_image_url);
      const hasVideo = !!(format === 'video' ? fileUrl : currentProj.video_url);
      if (hasStoryboard && hasVideo) {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
      } else if (!currentProj.storyboard_image_url || !currentProj.video_url) {
        updateData.status = 'processing';
        updateData.processing_at = new Date().toISOString();
      }
    }

    const { error: updateErr } = await supabaseAdmin
      .from('projects')
      .update(updateData)
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
    const format = (searchParams.get('format') as 'video' | 'storyboard') || 'storyboard';
    const fileName = searchParams.get('fileName') || (format === 'video' ? 'video.mp4' : 'image.png');

    // 查询项目信息用于构造文件名
    const { data: proj } = await supabaseAdmin
      .from('projects')
      .select('id, user_id, child_name, project_name, style_id')
      .eq('id', numId)
      .single();

    // 生成带时间戳的 key，确保重新上传时不会和旧文件冲突
    const baseKey = getQiniuKey(format, {
      projectId: numId,
      userId: proj?.user_id,
      childName: proj?.child_name ?? '',
      projectName: proj?.project_name ?? '',
      styleId: proj?.style_id ?? '',
    }, fileName);
    // 在扩展名前插入时间戳，如: videos/xxx_1717612345.mp4
    const dotIndex = baseKey.lastIndexOf('.');
    const qiniuKey = dotIndex > 0
      ? baseKey.slice(0, dotIndex) + '_' + String(Date.now()) + baseKey.slice(dotIndex)
      : baseKey + '_' + String(Date.now());
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
