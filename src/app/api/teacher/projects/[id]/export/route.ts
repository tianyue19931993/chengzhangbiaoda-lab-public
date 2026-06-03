import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/teacher/projects/[id]/export - upload file (storyboard or video) + log export
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file     = formData.get('file') as File | null;
    const format   = (formData.get('format') as string) || 'storyboard'; // 'storyboard' | 'video'
    const teacherId = formData.get('teacherId') as string || 'system';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Determine bucket by format
    const bucketMap: Record<string, string> = {
      storyboard: 'generated-images',
      video: 'videos',
    };
    const bucket = bucketMap[format];
    if (!bucket) {
      return NextResponse.json({ success: false, error: 'Invalid format. Use storyboard or video' }, { status: 400 });
    }

    // Upload to storage
    const ext = file.name.split('.').pop() ?? (format === 'video' ? 'mp4' : 'png');
    const fileName = format + '/' + id + '-' + Date.now() + '.' + ext;

    const { error: storageErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (storageErr) {
      return NextResponse.json({ success: false, error: 'Upload failed: ' + storageErr.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
    const fileUrl = urlData.publicUrl;

    // Update project field
    const updateField = format === 'storyboard' ? 'storyboard_image_url' : 'video_url';
    const { error: updateErr } = await supabaseAdmin
      .from('projects')
      .update({ [updateField]: fileUrl })
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ success: false, error: 'Update project failed: ' + updateErr.message }, { status: 500 });
    }

    // Log export
    const { error: logErr } = await supabaseAdmin
      .from('export_logs')
      .insert({
        project_id: id,
        teacher_id: teacherId,
        format,
        file_url: fileUrl,
      });

    if (logErr) {
      console.error('Failed to create export_log:', logErr);
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      data: { fileUrl, format },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
